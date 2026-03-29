import paramiko
import os

print("Connecting to VPS 148.230.66.181...")
try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('148.230.66.181', username='root', key_filename=os.path.expanduser('~/.ssh/id_rsa_vps'))
    
    print("Uploading app.py...")
    sftp = client.open_sftp()
    sftp.put(r'd:\NeuralAgent3.0\backend\app.py', '/root/NeuralAgent3.0/backend/app.py')
    sftp.close()
    
    print("Restarting vaidyamedx service...")
    stdin, stdout, stderr = client.exec_command('systemctl restart vaidyamedx')
    err = stderr.read().decode().strip()
    out = stdout.read().decode().strip()
    if err:
        print("Service Restart Errors:", err)
    if out:
        print("Service Restart Output:", out)
        
    client.close()
    print("Backend deployed and service restarted successfully!")
except Exception as e:
    print(f"Deployment failed: {e}")
