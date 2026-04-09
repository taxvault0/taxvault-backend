const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Upload file to S3
const uploadToS3 = async (file, folder) => {
    try {
        const fileContent = fs.readFileSync(file.path);
        
        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
        
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: fileContent,
            ContentType: file.mimetype,
            ServerSideEncryption: 'AES256',
            Metadata: {
                originalName: file.originalname,
                uploadedBy: 'taxvault',
                uploadedAt: new Date().toISOString()
            }
        };

        const result = await s3.upload(params).promise();
        
        // Clean up local file
        fs.unlinkSync(file.path);
        
        // Also clean up thumbnail if exists
        if (file.thumbnail) {
            fs.unlinkSync(file.thumbnail);
        }
        
        return {
            url: result.Location,
            key: result.Key,
            bucket: result.Bucket
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload file to S3');
    }
};

// Delete file from S3
const deleteFromS3 = async (fileKey) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey
        };

        await s3.deleteObject(params).promise();
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete file from S3');
    }
};

// Generate signed URL for temporary access
const generateSignedUrl = async (fileKey, expiresIn = 3600) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            Expires: expiresIn // seconds
        };

        const url = await s3.getSignedUrlPromise('getObject', params);
        return url;
    } catch (error) {
        console.error('S3 signed URL error:', error);
        throw new Error('Failed to generate signed URL');
    }
};

// List files in folder
const listFiles = async (prefix) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Prefix: prefix
        };

        const data = await s3.listObjectsV2(params).promise();
        
        return data.Contents.map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
            etag: item.ETag
        }));
    } catch (error) {
        console.error('S3 list error:', error);
        throw new Error('Failed to list files');
    }
};

// Copy file within S3
const copyFile = async (sourceKey, destinationKey) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            CopySource: `${process.env.AWS_BUCKET_NAME}/${sourceKey}`,
            Key: destinationKey,
            ServerSideEncryption: 'AES256'
        };

        const result = await s3.copyObject(params).promise();
        return result;
    } catch (error) {
        console.error('S3 copy error:', error);
        throw new Error('Failed to copy file');
    }
};

// Check if file exists
const fileExists = async (fileKey) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey
        };

        await s3.headObject(params).promise();
        return true;
    } catch (error) {
        if (error.code === 'NotFound') {
            return false;
        }
        throw error;
    }
};

module.exports = {
    uploadToS3,
    deleteFromS3,
    generateSignedUrl,
    listFiles,
    copyFile,
    fileExists
};












