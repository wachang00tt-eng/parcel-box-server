require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================================================
// ตัวแปรสถานะระบบ
// =====================================================

// จำนวนพัสดุที่รับตั้งแต่ Server เริ่มทำงาน
let parcelCount = 0;

// สถานะกล่อง
// false = ว่าง
// true  = มีพัสดุ
let parcelPresent = false;

// ระยะล่าสุดที่ ESP32 ส่งมา
let lastDistance = 0;

// เวลาที่พบพัสดุล่าสุด
let lastParcelTime = null;


// =====================================================
// หน้าแรก
// =====================================================

app.get("/", (req, res) => {

  res.send("📦 Parcel Box V3 Server is Running");

});


// =====================================================
// Health Check
// =====================================================

app.get("/health", (req, res) => {

  res.json({

    status: "OK",

    server: "Parcel Box V3",

    parcelPresent: parcelPresent,

    parcelCount: parcelCount,

    lastDistance: lastDistance,

    lastParcelTime: lastParcelTime

  });

});


// =====================================================
// รับข้อมูลจาก ESP32
// =====================================================

app.post("/webhook", async (req, res) => {

  try {

    // =================================================
    // รับข้อมูลจาก ESP32
    // =================================================

    const message =
      req.body.message || "พบพัสดุใหม่";

    const distance =
      Number(req.body.distance || 0);

    const count =
      Number(req.body.count || 0);


    console.log("--------------------------------");
    console.log("ESP32 DATA RECEIVED");
    console.log("Message :", message);
    console.log("Distance :", distance);
    console.log("Count :", count);
    console.log("--------------------------------");


    // =================================================
    // อัปเดตสถานะ
    // =================================================

    parcelPresent = true;

    lastDistance = distance;

    lastParcelTime =
      new Date().toISOString();


    // ใช้จำนวนจาก ESP32 ถ้ามี
    if (count > parcelCount) {

      parcelCount = count;

    }
    else {

      parcelCount++;

    }


    // =================================================
    // เวลาไทย
    // =================================================

    const thaiTime =
      new Date().toLocaleString(
        "th-TH",
        {
          timeZone: "Asia/Bangkok"
        }
      );


    // =================================================
    // สร้างข้อความ LINE
    // =================================================

    const text =
`📦 แจ้งเตือนพัสดุใหม่
━━━━━━━━━━━━━━━━

สถานะ : มีพัสดุเข้าแล้ว ✅

📦 จำนวนวันนี้ : ${parcelCount} ชิ้น

📏 ระยะตรวจพบ : ${distance.toFixed(1)} cm

🕐 เวลา : ${thaiTime}

🌐 ระบบ : Online
📶 ESP32 : Connected

━━━━━━━━━━━━━━━━
Parcel Box V3`;


    // =================================================
    // ส่งข้อความไป LINE
    // =================================================

    await axios.post(

      "https://api.line.me/v2/bot/message/push",

      {

        to: process.env.USER_ID,

        messages: [

          {

            type: "text",

            text: text

          }

        ]

      },

      {

        headers: {

          Authorization:
            `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,

          "Content-Type":
            "application/json"

        }

      }

    );


    console.log("✅ LINE SENT SUCCESS");


    // =================================================
    // ตอบกลับ ESP32
    // =================================================

    res.json({

      success: true,

      message: "LINE notification sent",

      parcelCount: parcelCount,

      parcelPresent: parcelPresent

    });


  }

  catch (error) {


    // =================================================
    // แสดง Error
    // =================================================

    console.log(
      "❌ ERROR :",
      error.response?.data ||
      error.message
    );


    res.status(500).json({

      success: false,

      error:
        error.response?.data ||
        error.message

    });

  }

});


// =====================================================
// LINE Webhook
// =====================================================

app.post("/line-webhook", async (req, res) => {

  try {

    console.log(
      "LINE EVENT :",
      JSON.stringify(req.body)
    );


    // LINE ต้องการ HTTP 200
    res.status(200).send("OK");


  }

  catch (error) {

    console.log(error);

    res.status(200).send("OK");

  }

});


// =====================================================
// เริ่ม Server
// =====================================================

app.listen(PORT, () => {

  console.log("================================");
  console.log("Parcel Box V3 Server Started");
  console.log("Port :", PORT);
  console.log("================================");

});
