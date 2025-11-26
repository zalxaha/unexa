const express  = require('express');
const multer   = require('multer');
const { Octokit } = require('@octokit/rest');
const sanitize = require('sanitize-filename');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// Batas ukuran file disesuaikan menjadi 75MB
const MAX_FILE_SIZE = 75 * 1024 * 1024; 

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  
  // Filter hanya menerima tipe MIME 'application/zip'
  fileFilter(_, file, cb) {
    const ok = file.mimetype === 'application/zip';
    if (!ok) {
        return cb(new Error('Hanya file tipe ZIP (application/zip) yang diizinkan.'), false);
    }
    cb(null, true);
  }
});

// Rate-limiter (dibiarkan sama)
app.use(rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Pastikan variabel lingkungan ini diset di file .env Anda
const { GH_OWNER, GH_REPO } = process.env;
const BRANCH = process.env.GH_BRANCH || 'main';

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    // 1. Cek File
    if (!req.file) {
      // Jika error dari fileFilter, Multer akan menanganinya dan tidak ada req.file
      return res.status(400).json({ error: 'Tidak ada file diunggah atau tipe file salah.' });
    }
    
    // 2. Persiapan Data
    const safeName = `${Date.now()}-${sanitize(req.file.originalname)}`;
    // Menggunakan Buffer.toString('base64') untuk konten yang akan diupload ke GitHub
    const content  = req.file.buffer.toString('base64');

    // 3. Upload ke GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner: GH_OWNER,
      repo: GH_REPO,
      path: `uploads/${safeName}`, // Simpan di direktori 'uploads'
      message: `upload zip: ${safeName}`,
      content,
      branch: BRANCH,
      committer: { name: 'ZIP Upload Bot', email: 'zipbot@example.com' }
    });

    // 4. Respon Sukses
    res.json({
      ok: true,
      filename: safeName,
      url: `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${BRANCH}/uploads/${safeName}`
    });
  } catch (e) {
    // Menangkap error umum (misalnya dari Octokit atau batasan Multer)
    console.error('Error during upload:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Anda mungkin perlu memastikan './list' ada atau menghapusnya jika tidak diperlukan
const listRoute = require('./list');
app.use(listRoute);

module.exports = app;
