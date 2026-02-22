import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : undefined,
  // keyFile: !process.env.GOOGLE_CREDENTIALS ? (process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, "../../credentials.json")) : undefined,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

async function existsInDrive(deezerId) {
  const res = await drive.files.list({
    q: `name='deezer_${deezerId}.mp3'`,
    fields: "files(id)",
  });
  return res.data.files.length > 0;
}

async function getDriveFile(deezerId) {
  const result = await drive.files.list({
    q: `name='deezer_${deezerId}.mp3'`,
    fields: "files(id, size)",
  });

  if (!result.data.files.length) {
    return null;
  }

  const file = result.data.files[0];
  return file;
}

async function getDriveStream(fileId, range) {
  if (range) {
    const stream = await drive.files.get(
      { fileId, alt: "media" },
      {
        responseType: "stream",
        headers: { Range: range },
      }
    );
    return stream;
  } else {
    const stream = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );
    return stream;
  }
}

async function getDriveFileMetadata(fileId) {
  try {
    const file = await drive.files.get({
      fileId: fileId,
      fields: "id, size, name",
    });
    return file.data;
  } catch (error) {
    console.error("Error getting Drive file metadata:", error);
    return null;
  }
}

export { existsInDrive, getDriveFile, getDriveStream, getDriveFileMetadata };