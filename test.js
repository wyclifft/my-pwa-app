// test.js - Africa's Talking Sandbox SMS Test with URL-encoded body

const API_KEY = "atsk_40c7b2389ae792c53da5f60dd0e93d3eb1d6574601ba2e7e8b12a8ce587f7b2ff5c0dbc9";
const USERNAME = "sandbox"; // Always 'sandbox' in test mode

async function sendSMS() {
  const url = "https://api.sandbox.africastalking.com/version1/messaging";

  // Form data (x-www-form-urlencoded)
  const params = new URLSearchParams();
  params.append("username", USERNAME);
  params.append("to", "+254700000001,+254700000002,+254700000003, +254700000004, +254700000005, +254700000006"); // multiple numbers separated by comma
  params.append("message", "Hello from Africa’s Talking Sandbox 🚀");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: API_KEY
      },
      body: params
    });

    const text = await res.text();
    console.log("📩 Raw response:", text);

    try {
      const data = JSON.parse(text);
      console.log("✅ Parsed JSON:", data);
    } catch {
      console.log("⚠️ Response was not JSON, check above raw response.");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

sendSMS();
