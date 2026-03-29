import forge from 'node-forge';

/**
 * Generates an RSA-2048 key pair.
 * @returns {Promise<{publicKey: string, privateKey: string}>} PEM strings
 */
export const generateRSAKeyPair = async () => {
    return new Promise((resolve, reject) => {
        // Run generation with web workers if available, otherwise fallback
        forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
            if (err) return reject(err);
            const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
            const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
            resolve({ publicKey: publicKeyPem, privateKey: privateKeyPem });
        });
    });
};

/**
 * Encrypts a plaintext string to an RSA+AES Hybrid Encrypted bundle for TWO recipients (Sender and Receiver).
 * @param {string} plaintext - The raw string/JSON to encrypt.
 * @param {string} recipientPublicKeyPem - The receiver's RSA Public Key in PEM format.
 * @param {string} senderPublicKeyPem - The sender's OWN RSA Public Key in PEM format (for history).
 * @returns {object} Base64 encoded bundle
 */
export const hybridEncrypt = (plaintext, recipientPublicKeyPem, senderPublicKeyPem) => {
    try {
        // 1. Generate random 256-bit AES key and 96-bit IV
        const aesKey = forge.random.getBytesSync(32);
        const iv = forge.random.getBytesSync(12);

        // 2. Encrypt plaintext with AES-256-GCM
        const cipher = forge.cipher.createCipher('AES-GCM', aesKey);
        cipher.start({ iv: iv });
        cipher.update(forge.util.createBuffer(forge.util.encodeUtf8(plaintext)));
        cipher.finish();

        const ciphertext = cipher.output.getBytes();
        const tag = cipher.mode.tag.getBytes();

        // 3. Encrypt AES key using recipient's AND sender's RSA public keys
        const recPub = forge.pki.publicKeyFromPem(recipientPublicKeyPem);
        const senPub = forge.pki.publicKeyFromPem(senderPublicKeyPem);
        
        const encryptedAesKey_receiver = recPub.encrypt(aesKey, 'RSA-OAEP', {
            md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() }
        });
        const encryptedAesKey_sender = senPub.encrypt(aesKey, 'RSA-OAEP', {
            md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() }
        });

        // 4. Return Base64 encoded cryptogram bundle
        return {
            encryptedAesKey_receiver: forge.util.encode64(encryptedAesKey_receiver),
            encryptedAesKey_sender: forge.util.encode64(encryptedAesKey_sender),
            iv: forge.util.encode64(iv),
            ciphertext: forge.util.encode64(ciphertext),
            tag: forge.util.encode64(tag)
        };
    } catch (e) {
        console.error("Hybrid Encryption failed:", e);
        return null;
    }
};

/**
 * Decrypts a Hybrid Encrypted bundle back to plaintext.
 * @param {object} bundle - { encryptedAesKey, iv, ciphertext, tag } (Base64)
 * @param {string} privateKeyPem - The receiver's RSA Private Key in PEM format.
 * @returns {string|null} The decrypted plaintext, or null if decryption fails.
 */
export const hybridDecrypt = (bundle, privateKeyPem) => {
    try {
        if (!bundle || !bundle.encryptedAesKey || !bundle.iv) return null;

        const { encryptedAesKey, iv, ciphertext, tag } = bundle;
        
        // 1. Decrypt AES key using our RSA private key
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        const aesKey = privateKey.decrypt(forge.util.decode64(encryptedAesKey), 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: { md: forge.md.sha256.create() }
        });

        // 2. Decrypt message using AES-256-GCM
        const decipher = forge.cipher.createDecipher('AES-GCM', aesKey);
        decipher.start({
            iv: forge.util.decode64(iv),
            tag: forge.util.createBuffer(forge.util.decode64(tag))
        });
        decipher.update(forge.util.createBuffer(forge.util.decode64(ciphertext)));
        const pass = decipher.finish();

        if (pass) {
            return forge.util.decodeUtf8(decipher.output.getBytes());
        }
        console.error("AES-GCM Authentication tag verification failed.");
        return null;
    } catch (e) {
        console.error("Hybrid Decryption failed:", e);
        return null;
    }
};
