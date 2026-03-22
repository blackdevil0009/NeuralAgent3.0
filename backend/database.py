import mysql.connector
import os
from mysql.connector import Error

# MySQL Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'vaidyamedx',
    'password': 'Devil@2007%',
    'database': 'neuralagent_db'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        if conn.is_connected():
            return conn
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        return None

def init_db():
    # First connect without database to create it if it doesn't exist
    try:
        temp_conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = temp_conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        temp_conn.close()
    except Error as e:
        print(f"Error creating database: {e}")
        return

    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor(dictionary=True)
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fullName VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            mobile VARCHAR(20),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(10),
            dob VARCHAR(50),
            gender VARCHAR(20),
            blood_group VARCHAR(20),
            rsaPublicKey TEXT,
            rsaPrivateKeyEncrypted TEXT,
            isVerified BOOLEAN DEFAULT FALSE,
            verificationToken VARCHAR(255),
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Doctor details table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS doctor_details (
            userId INT PRIMARY KEY,
            degree VARCHAR(255),
            position VARCHAR(255),
            specialization VARCHAR(255),
            experience VARCHAR(100),
            hospital VARCHAR(255),
            regNumber VARCHAR(100),
            documentPath VARCHAR(512),
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Schema Migration: Add fileSize if missing
    try:
        cursor.execute("ALTER TABLE patient_reports ADD COLUMN fileSize VARCHAR(50) AFTER displayName")
        conn.commit()
    except:
        pass # Already exists

    # Schema Migration: Add verification columns to users if missing
    migration_tasks = [
        "ALTER TABLE users ADD COLUMN dob VARCHAR(50) AFTER pincode",
        "ALTER TABLE users ADD COLUMN gender VARCHAR(20) AFTER dob",
        "ALTER TABLE users ADD COLUMN blood_group VARCHAR(20) AFTER gender",
        "ALTER TABLE users ADD COLUMN isVerified BOOLEAN DEFAULT FALSE AFTER rsaPrivateKeyEncrypted",
        "ALTER TABLE users ADD COLUMN verificationToken VARCHAR(255) AFTER isVerified"
    ]
    for task in migration_tasks:
        try:
            cursor.execute(task)
            conn.commit()
        except:
            pass # Already exists

    # Patient details table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_details (
            userId INT PRIMARY KEY,
            dob VARCHAR(50),
            gender VARCHAR(20),
            dosha VARCHAR(50),
            allergies TEXT,
            conditions TEXT,
            medications TEXT,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # Secure Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            senderId INT NOT NULL,
            receiverId INT NOT NULL,
            encryptedContext TEXT NOT NULL,
            signature VARCHAR(512),
            isDoctorResponded BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(senderId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(receiverId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # Appointments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patientId INT NOT NULL,
            doctorId INT NOT NULL,
            appointmentDate DATE NOT NULL,
            appointmentTime TIME NOT NULL,
            type VARCHAR(50) NOT NULL, -- 'Video Call' or 'Chat'
            status VARCHAR(50) DEFAULT 'Scheduled', -- 'Scheduled', 'Completed', 'Cancelled'
            notes TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patientId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(doctorId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            sourceType ENUM('Appointment', 'Message', 'Call') NOT NULL,
            content TEXT NOT NULL,
            isRead BOOLEAN DEFAULT FALSE,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # OTP Verification table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS otp_verification (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            mobile VARCHAR(20) NOT NULL,
            otp VARCHAR(6) NOT NULL,
            attempts INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Password Resets table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
    ''')

    # Emergencies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emergencies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patientId INT NOT NULL,
            patientName VARCHAR(255),
            contact VARCHAR(20),
            caseType VARCHAR(50),
            description TEXT,
            status VARCHAR(50) DEFAULT 'Active',
            handledById INT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patientId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(handledById) REFERENCES users(id) ON DELETE SET NULL
        )
    ''')

    # Medical Reports table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            filename VARCHAR(512) NOT NULL,
            displayName VARCHAR(255) NOT NULL,
            fileSize VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Pending',
            summary TEXT,
            ayurvedicInsights TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # Health Metrics (Vitals) table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_health_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            metricType VARCHAR(50) NOT NULL, -- 'Heart Rate', 'Blood Pressure', etc.
            val VARCHAR(50) NOT NULL,
            unit VARCHAR(20),
            changeDir VARCHAR(10) DEFAULT 'up', -- 'up' or 'down'
            changeText VARCHAR(50), -- e.g. '+2%' or 'Normal'
            color VARCHAR(20) DEFAULT 'blue',
            analyzedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # Analyzed Symptoms table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_symptoms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            symptom VARCHAR(255) NOT NULL,
            severity VARCHAR(50) DEFAULT 'Moderate',
            sourceReportId INT NULL,
            analyzedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(sourceReportId) REFERENCES patient_reports(id) ON DELETE SET NULL
        )
    ''')

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("MySQL Database initialized.")
