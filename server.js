require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================================================
// สถานะระบบ
// =====================================================

let parcelCount = 0;
let parcelPresent = false;
let lastDistance = 0;
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
// ฟังก์ชันส่งข้อความ LINE
// =====================================================

async function sendLineMessage(text) {

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

}


// =====================================================
// รับข้อมูลจาก ESP32
// =====================================================

app.post("/webhook", async (req, res) => {

  try {

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


    // อัปเดตสถานะ

    parcelPresent = true;

    lastDistance = distance;

    lastParcelTime = new Date().toISOString();


    // อัปเดตจำนวน

    if (count > parcelCount) {

      parcelCount = count;

    }
    else {

      parcelCount++;

    }


    // เวลาไทย

    const thaiTime =
      new Date().toLocaleString(
        "th-TH",
        {
          timeZone: "Asia/Bangkok"
        }
      );


    // ข้อความแจ้งเตือน

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


    await sendLineMessage(text);


    console.log("✅ LINE SENT SUCCESS");


    res.json({

      success: true,

      parcelCount: parcelCount,

      parcelPresent: parcelPresent

    });


  }

  catch (error) {

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
// รับข้อความจาก LINE
// =====================================================

app.post("/line-webhook", async (req, res) => {

  try {

    console.log(
      "LINE EVENT :",
      JSON.stringify(req.body)
    );


    // ตอบ LINE ก่อน
    res.status(200).send("OK");


    // ตรวจสอบ Event

    if (!req.body.events) {

      return;

    }


    for (const event of req.body.events) {

      // รับเฉพาะข้อความ

      if (
        event.type !== "message" ||
        event.message.type !== "text"
      ) {

        continue;

      }


      const userText =
        event.message.text.trim();


      console.log(
        "LINE MESSAGE :",
        userText
      );


      // =================================================
      // คำสั่ง "สถานะ"
      // =================================================

      if (userText === "สถานะ") {

        const status =
          parcelPresent
            ? "มีพัสดุ 📦"
            : "กล่องว่าง 📭";


        const thaiTime =
          lastParcelTime
            ? new Date(lastParcelTime)
                .toLocaleString(
                  "th-TH",
                  {
                    timeZone: "Asia/Bangkok"
                  }
                )
            : "ยังไม่มีข้อมูล";


        const text =
`📦 สถานะ Parcel Box
━━━━━━━━━━━━━━━━

สถานะ : ${status}

📦 จำนวนพัสดุ : ${parcelCount} ชิ้น

📏 ระยะล่าสุด : ${lastDistance.toFixed(1)} cm

🕐 รับพัสดุล่าสุด :
${thaiTime}

🌐 Server : Online

━━━━━━━━━━━━━━━━
Parcel Box V3`;


        await replyLineMessage(
          event.replyToken,
          text
        );

      }


      // =================================================
      // คำสั่ง "จำนวน"
      // =================================================

      else if (userText === "จำนวน") {

        const text =
`📦 จำนวนพัสดุ

วันนี้รับแล้ว :
${parcelCount} ชิ้น`;


        await replyLineMessage(
          event.replyToken,
          text
        );

      }


      // =================================================
      // คำสั่ง "รีเซ็ต"
      // =================================================

      else if (userText === "รีเซ็ต") {

        parcelCount = 0;

        const text =
`🔄 รีเซ็ตเรียบร้อยแล้ว

📦 จำนวนพัสดุ :
0 ชิ้น

พร้อมรับพัสดุใหม่ครับ 📦`;


        await replyLineMessage(
          event.replyToken,
          text
        );

      }


      // =================================================
      // คำสั่ง "ช่วยเหลือ"
      // =================================================

      else if (userText === "ช่วยเหลือ") {

        const text =
`🤖 Parcel Box V3

คำสั่งที่ใช้ได้:

📦 สถานะ
ดูสถานะกล่อง

🔢 จำนวน
ดูจำนวนพัสดุ

🔄 รีเซ็ต
รีเซ็ตจำนวนพัสดุ

❓ ช่วยเหลือ
ดูคำสั่งทั้งหมด`;


        await replyLineMessage(
          event.replyToken,
          text
        );

      }

    }

  }

  catch (error) {

    console.log(
      "LINE WEBHOOK ERROR :",
      error.response?.data ||
      error.message
    );

  }

});


// =====================================================
// Reply Message ไป LINE
// =====================================================

async function replyLineMessage(
  replyToken,
  text
) {

  try {

    await axios.post(

      "https://api.line.me/v2/bot/message/reply",

      {

        replyToken: replyToken,

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


    console.log(
      "✅ LINE REPLY SENT"
    );

  }

  catch (error) {

    console.log(
      "❌ REPLY ERROR :",
      error.response?.data ||
      error.message
    );

  }

}


// =====================================================
// เริ่ม Server
// =====================================================

app.listen(PORT, () => {

  console.log("================================");
  console.log("Parcel Box V3 Server Started");
  console.log("Port :", PORT);
  console.log("================================");

});
