const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const fs = require('fs');
const sharp = require('sharp');

// Extract text from image using Tesseract
const extractTextFromImage = async (imagePath) => {
    try {
        // Preprocess image for better OCR
        const processedImagePath = imagePath.replace(/(\.[^/.]+)$/, '_processed$1');
        
        await sharp(imagePath)
            .greyscale()
            .normalize()
            .sharpen()
            .toFile(processedImagePath);

        const { data: { text } } = await Tesseract.recognize(
            processedImagePath,
            'eng',
            {
                logger: m => console.log(m) // Optional: log progress
            }
        );

        // Clean up processed image
        fs.unlinkSync(processedImagePath);

        return text;
    } catch (error) {
        console.error('OCR error:', error);
        throw new Error('Failed to extract text from image');
    }
};

// Extract text from PDF
const extractTextFromPDF = async (pdfPath) => {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
};

// Parse receipt data from extracted text
const parseReceiptData = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Common patterns
    const patterns = {
        date: /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/i,
        amount: /\$\s*(\d+\.\d{2})|\b(\d+\.\d{2})\b(?!\s*%)/,
        gst: /GST[:\s]*\$?(\d+\.\d{2})|HST[:\s]*\$?(\d+\.\d{2})|PST[:\s]*\$?(\d+\.\d{2})/i,
        vendor: /^([A-Z][A-Za-z\s]+)(?=\n|$)/m
    };

    // Extract vendor (usually first few lines)
    let vendor = '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        if (lines[i].length > 3 && lines[i].length < 50 && !lines[i].includes('$')) {
            vendor = lines[i].trim();
            break;
        }
    }

    // Extract date
    let date = '';
    for (const line of lines) {
        const match = line.match(patterns.date);
        if (match) {
            date = match[0];
            break;
        }
    }

    // Extract total amount
    let amount = 0;
    for (const line of lines) {
        const match = line.match(patterns.amount);
        if (match) {
            amount = parseFloat(match[1] || match[2]);
            break;
        }
    }

    // Extract GST/HST
    let gst = 0;
    for (const line of lines) {
        const match = line.match(patterns.gst);
        if (match) {
            gst = parseFloat(match[1] || match[2] || match[3]);
            break;
        }
    }

    return {
        vendor: vendor || 'Unknown Vendor',
        date: date || null,
        amount: amount || 0,
        gst: gst || 0,
        confidence: {
            vendor: vendor ? 0.8 : 0.2,
            date: date ? 0.7 : 0.1,
            amount: amount ? 0.9 : 0.1,
            gst: gst ? 0.6 : 0.1,
            overall: (vendor ? 0.2 : 0) + (date ? 0.2 : 0) + (amount ? 0.3 : 0) + (gst ? 0.3 : 0)
        }
    };
};

// Main OCR function
const processReceipt = async (filePath, fileType) => {
    try {
        let text = '';

        // Extract text based on file type
        if (fileType.includes('pdf')) {
            text = await extractTextFromPDF(filePath);
        } else {
            text = await extractTextFromImage(filePath);
        }

        // Parse the extracted text
        const parsedData = parseReceiptData(text);

        return {
            success: true,
            text: text.substring(0, 500), // Store first 500 chars as sample
            data: parsedData,
            extractedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Receipt processing error:', error);
        return {
            success: false,
            error: error.message,
            extractedAt: new Date().toISOString()
        };
    }
};

module.exports = { processReceipt };












