const ShareModel = require("../model/share.model");
const FileModel  = require("../model/files.model");
const axios      = require("axios");
const path       = require("path");

// ─── Send email via Brevo HTTP API (no SMTP — works on all cloud platforms) ───
// SMTP ports (587/465) are frequently blocked by cloud providers.
// Brevo's REST API uses plain HTTPS — never blocked.
const sendEmail = async ({ to, subject, html }) => {
  const response = await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender:      { name: "Filemoon", email: process.env.BREVO_EMAIL },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    },
    {
      headers: {
        "api-key":      process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
  return response.data;
};






// ─── Email template ───────────────────────────────────────────────────────────
const getEmailTemplate = (link, filename) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your File is Ready for Download</title>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f6f8; padding: 40px 0; border-collapse: collapse;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-collapse: collapse;">

                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="background-color: #4f46e5; padding: 30px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; line-height: 1.2;">Your File is Ready to Download</h1>
                        </td>
                    </tr>

                    <!-- CONTENT -->
                    <tr>
                        <td style="padding: 40px 30px; background-color: #ffffff; color: #333333; font-size: 16px; line-height: 1.6;">
                            <h2 style="font-size: 20px; margin-top: 0; margin-bottom: 16px; color: #111111;">Hello!</h2>
                            <p style="margin-top: 0; margin-bottom: 16px;">Someone has shared a file with you via Filemoon. It is ready for immediate download.</p>

                            <p style="margin-top: 0; margin-bottom: 24px; background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <strong style="color: #111111;">File:</strong>
                                <code style="font-family: monospace; background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${filename}</code>
                            </p>

                            <!-- BUTTON -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 15px 0 30px 0;">
                                        <a href="${link}" style="background-color: #4f46e5; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 220px;">Download File</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin-top: 0; margin-bottom: 8px; font-size: 14px; color: #6b7280;">Trouble with the button? Paste this link into your browser:</p>
                            <p style="margin-top: 0; margin-bottom: 24px; word-break: break-all; font-size: 14px;">
                                <a href="${link}" style="color: #4f46e5; text-decoration: underline;">${link}</a>
                            </p>

                            <p style="margin-top: 0; margin-bottom: 24px;">Thanks,<br><strong style="color: #111111;">The Filemoon Team</strong></p>

                            <hr style="border: 0; border-top: 1px dashed #e5e7eb; margin: 24px 0;">

                            <p style="margin: 0; font-family: 'Caveat', cursive; font-size: 21px; color: #4f46e5; line-height: 1.4; font-weight: 500;">
                                P.S. I hope this file is exactly what you needed. Feel free to reply with any feedback!
                            </p>
                            <p style="margin: 0; font-family: 'Caveat', cursive; font-size: 22px; color: #4f46e5; text-align: right; font-weight: bold; padding-right: 20px;">— Azee</p>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px;">You received this because a file was shared with your email address.</p>
                            <p style="margin: 0;">&copy; 2026 Filemoon</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
  `;
};

// ─── Share File ───────────────────────────────────────────────────────────────
const shareFile = async (req, res) => {
  try {
    const { email, fileId } = req.body;
    if (!email || !fileId) {
      return res.status(400).json({ message: "Email and fileId are required" });
    }

    const file = await FileModel.findOne({ _id: fileId, user: req.user.id });
    if (!file) return res.status(404).json({ message: "File not found" });

    const link = `${process.env.DOMAIN}/share/${fileId}`;

    // Send email + save share record in parallel
    await Promise.all([
      sendEmail({
        to:      email,
        subject: "Filemoon — Someone shared a file with you",
        html:    getEmailTemplate(link, file.filename),
      }),
      ShareModel.create({ user: req.user.id, receiverEmail: email, file: fileId }),
    ]);

    res.status(200).json({ message: "File shared successfully!" });

  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error("[share] Brevo API error:", JSON.stringify(detail));
    res.status(500).json({ message: `Email failed: ${typeof detail === "string" ? detail : JSON.stringify(detail)}` });
  }
};

// ─── Public shared-file download (no auth required) ───────────────────────────
const downloadShared = async (req, res) => {
  try {
    const { fileId } = req.params;

    const share = await ShareModel.findOne({ file: fileId }).populate("file");
    if (!share || !share.file) {
      return res.status(404).json({ message: "Shared file not found or link is invalid" });
    }

    const file = share.file;

    // ── Cloudinary (new records) ──────────────────────────────────────────────
    if (file.cloudinaryUrl) {
      // Insert fl_attachment so browser downloads instead of previewing
      const downloadUrl = file.cloudinaryUrl.replace("/upload/", "/upload/fl_attachment/");
      return res.redirect(downloadUrl);
    }

    // ── Legacy: serve from disk (old records before Cloudinary migration) ─────
    const ext      = file.type.split("/").pop();
    const diskPath = file.storedName
      ? path.join(process.cwd(), "files", file.storedName)
      : path.join(process.cwd(), file.path);

    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}.${ext}"`);
    res.sendFile(diskPath, (err) => {
      if (err) res.status(404).json({ message: "File not found on server" });
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Fetch Share History ──────────────────────────────────────────────────────
const fetchShared = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 0;
    const history = await ShareModel
      .find({ user: req.user.id })
      .populate("file")
      .sort({ createdAt: -1 })
      .limit(limit);
    res.status(200).json(history);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { shareFile, fetchShared, downloadShared };
