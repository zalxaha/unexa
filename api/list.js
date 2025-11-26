const express = require('express');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const router = express.Router();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const GH_OWNER = process.env.GH_OWNER;
const GH_REPO = process.env.GH_REPO;
const BRANCH = process.env.GH_BRANCH || 'main';

router.get('/api/list', async (req, res) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GH_OWNER,
      repo: GH_REPO,
      path: 'uploads',
      ref: BRANCH
    });

    const files = data
      // Hanya ambil file dan filter yang memiliki ekstensi .zip
      .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.zip'))
      .map(f => {
        const [timestamp, ...rest] = f.name.split('-');
        // Nama yang sudah bersih tanpa timestamp
        const name = rest.join('-') || f.name; 
        const tsNumber = Number(timestamp);
        // Cek validitas timestamp (asumsi timestamp ms)
        const isValid = !isNaN(tsNumber) && tsNumber > 1e12; 

        return {
          name: name,
          url: `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${BRANCH}/uploads/${f.name}`,
          isZip: true, // Selalu true karena sudah difilter
          date: isValid ? new Date(tsNumber).toISOString() : null
        };
      });

    res.json({ ok: true, files });
  } catch (err) {
    // Tangani error jika direktori 'uploads' tidak ditemukan atau error lainnya
    if (err.status === 404) {
        return res.status(200).json({ ok: true, files: [], message: 'Direktori uploads kosong atau tidak ditemukan.' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
