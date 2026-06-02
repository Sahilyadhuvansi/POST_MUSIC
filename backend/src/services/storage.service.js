"use strict";

const { ImageKit } = require("@imagekit/nodejs");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Upload from multer buffer
// originalName: original filename (for extension detection), folder: ImageKit subfolder
async function uploadFromBuffer(
  buffer,
  originalName = "file",
  folder = "music-discover",
) {
  const ext = originalName.includes(".")
    ? originalName.split(".").pop()
    : "bin";
  const uniqueName = `${folder.split("/").pop()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const result = await imagekit.files.upload({
    file: buffer.toString("base64"),
    fileName: uniqueName,
    folder,
  });
  return result;
}

// Delete a file from ImageKit by its file ID
async function deleteFile(fileId) {
  try {
    const result = await imagekit.files.delete(fileId);
    return result;
  } catch (error) {
    // Ignore "file not found" errors — the file may already be deleted
    if (error?.statusCode === 404 || error?.message?.includes("not found")) {
      // console log scrubbed
      return null;
    }
    throw error;
  }
}

// Get auth params for client-side uploads
function getAuthParams() {
  return imagekit.helper.getAuthenticationParameters();
}

module.exports = {
  uploadFromBuffer,
  deleteFile,
  getAuthParams,
};
