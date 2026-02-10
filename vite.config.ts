import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'

import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'save-file-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/save-history' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { fileName, content } = JSON.parse(body);
                const filePath = path.join(process.cwd(), 'public', 'history', fileName);
                
                // Ensure directory exists
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir, { recursive: true });
                }

                const buffer = Buffer.from(content, 'base64');
                fs.writeFileSync(filePath, buffer);
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, path: `/history/${fileName}` }));
              } catch (error) {
                console.error('Error saving file:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed' }));
              }
            });
          } else if (req.url === '/api/history-files' && req.method === 'GET') {
            try {
                const historyDir = path.join(process.cwd(), 'public', 'history');
                if (!fs.existsSync(historyDir)) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify([]));
                    return;
                }
                
                const files = fs.readdirSync(historyDir)
                    .filter(file => file.endsWith('.xlsx'))
                    .map(file => {
                        const stats = fs.statSync(path.join(historyDir, file));
                        return {
                            name: file,
                            size: stats.size,
                            mtime: stats.mtime
                        };
                    })
                    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Newest first

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(files));
            } catch (error) {
                console.error('Error listing files:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to list files' }));
            }
          } else if (req.url?.startsWith('/api/history-files/') && req.method === 'DELETE') {
             // NEW: Delete a History File (Excel)
             try {
                 const fileName = decodeURIComponent(req.url.split('/api/history-files/')[1]);
                 const filePath = path.join(process.cwd(), 'public', 'history', fileName);
                 if (fs.existsSync(filePath)) {
                     fs.unlinkSync(filePath);
                 }
                 res.setHeader('Content-Type', 'application/json');
                 res.end(JSON.stringify({ success: true }));
             } catch (e) {
                 console.error('Error deleting file:', e);
                 res.statusCode = 500;
                 res.end(JSON.stringify({ error: 'Failed to delete file' }));
             }
          } else if (req.url === '/api/save-history-json' && req.method === 'POST') {
             // NEW: Save History Record as JSON
             let body = '';
             req.on('data', (chunk) => { body += chunk.toString(); });
             req.on('end', () => {
                 try {
                     const record = JSON.parse(body);
                     const historyDir = path.join(process.cwd(), 'public', 'history', 'records');
                     if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
                     
                     const fileName = `record_${record.id}.json`;
                     fs.writeFileSync(path.join(historyDir, fileName), JSON.stringify(record, null, 2));
                     
                     res.setHeader('Content-Type', 'application/json');
                     res.end(JSON.stringify({ success: true }));
                 } catch (e) {
                     res.statusCode = 500;
                     res.end(JSON.stringify({ error: 'Failed to save record' }));
                 }
             });
          } else if (req.method === 'GET' && req.url === '/api/history-records') {
             // NEW: Get all History Records from JSON files
             try {
                 const historyDir = path.join(process.cwd(), 'public', 'history', 'records');
                 if (!fs.existsSync(historyDir)) {
                     res.setHeader('Content-Type', 'application/json');
                     res.end(JSON.stringify([]));
                     return;
                 }
                 
                 const records = fs.readdirSync(historyDir)
                     .filter(f => f.endsWith('.json'))
                     .map(f => {
                         try {
                             const content = fs.readFileSync(path.join(historyDir, f), 'utf-8');
                             return JSON.parse(content);
                         } catch { return null; }
                     })
                     .filter(r => r !== null)
                     .sort((a, b) => b.timestamp - a.timestamp);

                 res.setHeader('Content-Type', 'application/json');
                 res.end(JSON.stringify(records));
             } catch (e) {
                 res.statusCode = 500;
                 res.end(JSON.stringify({ error: 'Failed to fetch records' }));
             }
          } else if (req.method === 'DELETE' && req.url?.startsWith('/api/history-records/')) {
             // NEW: Delete a History Record
             try {
                 const id = req.url.split('/').pop();
                 const filePath = path.join(process.cwd(), 'public', 'history', 'records', `record_${id}.json`);
                 if (fs.existsSync(filePath)) {
                     fs.unlinkSync(filePath);
                 }
                 res.setHeader('Content-Type', 'application/json');
                 res.end(JSON.stringify({ success: true }));
             } catch (e) {
                 res.statusCode = 500;
                 res.end(JSON.stringify({ error: 'Failed to delete record' }));
             }
          } else {
            next();
          }
        });
      }
    }
  ],
})
