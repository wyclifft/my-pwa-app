// test.js
// Node.js v22+ (ESM syntax)

import fetch from 'node-fetch'; // Make sure to install: npm install node-fetch

const API_TOKEN = "ema9rRSKCCC0Kr80"; // Your SMSala API token
const ENDPOINT = "MCK";               // Your endpoint name

/**
 * Send SMS via SMSala
 * @param {string} to - Single or comma-separated phone numbers (e.g., "254712345678,254723456789")
 * @param {string} message - The SMS message content
 */
async function sendSMS(to, message) {
  const url = "https://smsala.com/api/sendSMS"; // SMSala API endpoint

  const payload = {
    endpoint: ENDPOINT,
    phonenumber: to,
    textmessage: message
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Raw response:", text);

    try {
      const data = JSON.parse(text);
      console.log("Parsed JSON response:", data);
    } catch {
      console.warn("Response is not valid JSON:", text);
    }

  } catch (err) {
    console.error("Error sending SMS:", err);
  }
}

// -------- Examples --------

// Single SMS
sendSMS("254712345678", "Hello from MCK App 🚀");

// Bulk SMS (comma-separated)
sendSMS("254712345678,254723456789,254701234567", "Reminder: Men’s fellowship this Sunday at 10am 🙏");
