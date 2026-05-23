import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const downloadBackup = async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `heating-supply-backup-${timestamp}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const dump = spawn('pg_dump', [
      '--no-owner',
      '--no-acl',
      '--clean',
      '--if-exists',
      'postgres://postgres:postgres@db:5432/heating_supply',
    ]);

    dump.stdout.pipe(res);
    dump.stderr.on('data', (data) => {
      console.error('pg_dump stderr:', data.toString());
    });
    dump.on('error', (err) => {
      console.error('pg_dump error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: '备份失败：' + err.message });
      }
    });
    dump.on('close', (code) => {
      if (code !== 0) {
        console.error(`pg_dump exited with code ${code}`);
      }
    });
  } catch (err) {
    next(err);
  }
};

export const restoreBackup = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: '请上传备份文件' });
    }

    // Write the uploaded buffer to a temp file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `restore-${Date.now()}.sql`);
    fs.writeFileSync(tmpFile, req.file.buffer);

    const psql = spawn('psql', [
      'postgres://postgres:postgres@db:5432/heating_supply',
    ]);

    // If needed, drop all tables first to get a clean restore
    // psql.stdin.write('DROP SCHEMA public CASCADE; CREATE SCHEMA public;\n');

    // Pipe the SQL file to psql
    const readStream = fs.createReadStream(tmpFile);
    readStream.pipe(psql.stdin);

    let stderr = '';
    psql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    psql.on('close', (code) => {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch {}

      if (code === 0) {
        res.json({ success: true, message: '数据恢复成功' });
      } else {
        console.error('psql restore error:', stderr);
        res.status(500).json({ error: '恢复失败', details: stderr });
      }
    });

    psql.on('error', (err) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      res.status(500).json({ error: '恢复失败：' + err.message });
    });
  } catch (err) {
    next(err);
  }
};
