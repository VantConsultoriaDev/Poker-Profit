import urllib.request
import zipfile
import os
import ssl
import sys

ssl._create_default_https_context = ssl._create_unverified_context

url = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip'
zip_path = os.path.join(os.getcwd(), 'node-portable.zip')
extract_dir = os.path.join(os.getcwd(), 'node-portable')
temp_dir = os.path.join(os.getcwd(), 'node-v20.18.0-win-x64')

try:
    if not os.path.exists(extract_dir):
        print('Downloading Node.js portable from:', url)
        def report(count, block_size, total_size):
            percent = int(count * block_size * 100 / total_size) if total_size > 0 else 0
            downloaded = count * block_size
            print(f'\rDownloaded {downloaded}/{total_size} bytes ({percent}%)', end='', flush=True)
        urllib.request.urlretrieve(url, zip_path, reporthook=report)
        print('\nExtracting ZIP...')
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall('.')
        print('Renaming...')
        if os.path.exists(temp_dir):
            os.rename(temp_dir, extract_dir)
        print('Cleaning up ZIP...')
        if os.path.exists(zip_path):
            os.remove(zip_path)
        print('Node.js portable setup complete!')
    else:
        print('Node.js portable already exists')

    node_exe = os.path.join(extract_dir, 'node.exe')
    npm_cmd = os.path.join(extract_dir, 'npm.cmd')
    print(f'node.exe: {node_exe} exists={os.path.exists(node_exe)}')
    print(f'npm.cmd: {npm_cmd} exists={os.path.exists(npm_cmd)}')

    if os.path.exists(node_exe):
        import subprocess
        result = subprocess.run([node_exe, '--version'], capture_output=True, text=True)
        print(f'Node version: {result.stdout.strip()}')
except Exception as e:
    print(f'ERROR: {type(e).__name__}: {e}', file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
