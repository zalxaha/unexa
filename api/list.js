const express = require('express');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const router = express.Router();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const GH_OWNER = process.env.GH_OWNER;
const GH_REPO = process.env.GH_REPO;
const BRANCH = process.env.GH_BRANCH || 'main';

router.get('/api/list', async (req, res) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GH_OWNER,
      repo: GH_REPO,
      path: 'backups',
      ref: BRANCH
    });

    /** 🔥 FIX PENTING
        → sebelumnya kamu pakai filter ZIP sehingga file lain & ZIP tidak terbaca
        → sekarang semua file diambil, zip/non-zip tetap tampil
    **/
    const files = data
      .filter(f => f.type === 'file') // ambil semua file
      .map(f => {
        const isZip = f.name.toLowerCase().endsWith('.zip');
        return {
          name: f.name,
          isZip,
          url: `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${BRANCH}/uploads/${f.name}`,
          size: f.size ? `${(f.size/1024).toFixed(1)} KB` : null,
          download: `https://github.com/${GH_OWNER}/${GH_REPO}/raw/${BRANCH}/uploads/${f.name}`
        };
      });

    return res.json({ ok: true, count: files.length, files });

  } catch (err) {

    // Jika folder tidak ada
    if (err.status === 404) {
      return res.json({ ok: true, files: [], message: "Folder uploads kosong / belum ada file." });
    }

    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
