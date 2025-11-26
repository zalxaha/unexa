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

    // ambil daftar file saja
    const filesOnly = data.filter(f => f.type === 'file');

    // ambil tanggal commit untuk tiap file
    const files = await Promise.all(
      filesOnly.map(async (f) => {

        const commits = await octokit.repos.listCommits({
          owner: GH_OWNER,
          repo: GH_REPO,
          path: `backups/${f.name}`,
          per_page: 1
        });

        const last = commits.data[0];
        const commitDate = last ? last.commit.author.date : null;

        return {
          name: f.name,
          isZip: f.name.toLowerCase().endsWith('.zip'),
          size: f.size ? `${(f.size/1024).toFixed(1)} KB` : null,
          date: commitDate ? new Date(commitDate).toLocaleString("id-ID", { timeZone:"Asia/Jakarta" }) : "-",
          timestamp: commitDate || null, // bisa dipakai sorting FE
          url: `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${BRANCH}/backups/${f.name}`,
          download: `https://github.com/${GH_OWNER}/${GH_REPO}/raw/${BRANCH}/backups/${f.name}`,
        };
      })
    );

    return res.json({ ok: true, count: files.length, files });

  } catch (err) {
    if (err.status === 404)
      return res.json({ ok: true, files: [], message: "Folder uploads kosong / belum ada file." });

    return res.status(500).json({ ok:false, error: err.message });
  }
});

module.exports = router;
