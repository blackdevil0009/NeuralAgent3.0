"""
Seed doctors from the PDF (tot_ua310314.pdf) into the database.
Maps designations to specializations for the frontend UI.
"""
import sys
sys.path.insert(0, '.')
from database import get_db_connection
from flask_bcrypt import Bcrypt
from flask import Flask
from security_utils import generate_rsa_keypair, encrypt_data

app = Flask(__name__)
bcrypt = Bcrypt(app)

# All 33 doctors parsed from the PDF
DOCTORS = [
    {"name": "Dr. C.M.S. Rawat", "designation": "Professor & Head", "district": "Nainital", "phone": "9412085617", "email": "drcms2000@rediffmail.com", "spec": "General Medicine"},
    {"name": "Dr. Bhagat Singh Rawat", "designation": "ACMO & DSO", "district": "Tehri Garhwal", "phone": "9412052145", "email": "cmotehrigarhwal@gmail.com", "spec": "General Medicine"},
    {"name": "Dr. Uttam Singh Chauhan", "designation": "ACMO & DSO", "district": "Dehradun", "phone": "9411184834", "email": "uttam.chauhan@neuralclinic.in", "spec": "General Medicine"},
    {"name": "Dr. G.B. Bisht", "designation": "ACMO", "district": "Pithoragarh", "phone": "9412963619", "email": "gb.bisht@neuralclinic.in", "spec": "General Medicine"},
    {"name": "Dr. Dayal Sharan", "designation": "DSO", "district": "Pauri Garhwal", "phone": "9897482867", "email": "dr.d.sharan@hotmail.com", "spec": "General Medicine"},
    {"name": "Dr. Yogesh Chandra Purohit", "designation": "DSO", "district": "Nainital", "phone": "9410939290", "email": "imdryogesh@gmail.com", "spec": "General Medicine"},
    {"name": "Dr. P.K. Upreti", "designation": "Senior DTO", "district": "Almora", "phone": "9412344666", "email": "dtouramr@rntcp.org", "spec": "Pulmonology"},
    {"name": "Dr. Ramesh Chandra Pant", "designation": "Sr. Chest Physician", "district": "Almora", "phone": "9411132716", "email": "rc.pant@neuralclinic.in", "spec": "Pulmonology"},
    {"name": "Dr. S.K. Goswami", "designation": "Sr. Pediatrician", "district": "Uddham Singh Nagar", "phone": "9897652404", "email": "drsanjeevkgoswami@gmail.com", "spec": "Pediatrics"},
    {"name": "Dr. Sundeep Nigam", "designation": "Medical Superintendent & Pediatrician", "district": "Haridwar", "phone": "9412017106", "email": "drsundeepnigam@gmail.com", "spec": "Pediatrics"},
    {"name": "Dr. Vivekanand Satyawali", "designation": "Assistant Professor", "district": "Nainital", "phone": "9412577213", "email": "vivek_satyawali@yahoo.co.in", "spec": "General Medicine"},
    {"name": "Dr. Sanjay Kumar Jha", "designation": "Assistant Professor", "district": "Nainital", "phone": "9458153911", "email": "drsanjaykumarjha@gmail.com", "spec": "General Medicine"},
    {"name": "Dr. Kumar Aditya Tewari", "designation": "Sr. Pathologist", "district": "Uddham Singh Nagar", "phone": "8006998557", "email": "kumarat1967@gmail.com", "spec": "Pathology"},
    {"name": "Dr. D.P. Joshi", "designation": "Pediatrician", "district": "Dehradun", "phone": "9897333882", "email": "dpjoshi84@gmail.com", "spec": "Pediatrics"},
    {"name": "Dr. H. Jangpangi", "designation": "Pediatrician", "district": "Nainital", "phone": "9412944682", "email": "hjangpangi@yahoo.co.uk", "spec": "Pediatrics"},
    {"name": "Dr. Deepika Jain", "designation": "Pathologist", "district": "Dehradun", "phone": "9410548268", "email": "d.jain13@yahoo.com", "spec": "Pathology"},
    {"name": "Dr. Kusma Rawat", "designation": "Pediatrician", "district": "Chamoli", "phone": "9410214852", "email": "kusmarawat02@gmail.com", "spec": "Pediatrics"},
    {"name": "Dr. K.K. Singh", "designation": "Pediatrician", "district": "Bageshwar", "phone": "9411525278", "email": "kksingh_67@rediffmail.com", "spec": "Pediatrics"},
    {"name": "Dr. K.R. Saun", "designation": "Orthopaedic Surgeon", "district": "Champawat", "phone": "9456363100", "email": "kr.saun@neuralclinic.in", "spec": "Orthopedics"},
    {"name": "Mr. Ved Prakash", "designation": "Epidemiologist", "district": "Chamoli", "phone": "9453739779", "email": "ved23jaiswal@gmail.com", "spec": "Epidemiology"},
    {"name": "Ms. Damyanti Rawat", "designation": "Microbiologist", "district": "Almora", "phone": "9634967034", "email": "damu.rawat@gmail.com", "spec": "Microbiology"},
    {"name": "Dr. Sanjay Karadwal", "designation": "Sr. Physician", "district": "New Tehri", "phone": "9412929121", "email": "sanjay.karadwal@neuralclinic.in", "spec": "General Medicine"},
    {"name": "Dr. R.P.S. Negi", "designation": "Senior Child Specialist", "district": "Pithoragarh", "phone": "9412957831", "email": "dr.rps.negi@gmail.com", "spec": "Pediatrics"},
    {"name": "Dr. Pundhir Rajshree", "designation": "Epidemiologist", "district": "Uttarakhand", "phone": "8860878155", "email": "rajshreepundhir@gmail.com", "spec": "Epidemiology"},
    {"name": "Dr. Shivi Agrawal", "designation": "Epidemiologist, IDSP", "district": "Udham Singh Nagar", "phone": "9415788771", "email": "idspep.usnagar@gmail.com", "spec": "Epidemiology"},
    {"name": "Dr. Himanshu Kumar", "designation": "BHMS, MPH", "district": "Pauri Garhwal", "phone": "7754024549", "email": "dr.himavishu.kumargkp@gmail.com", "spec": "Ayurveda"},
    {"name": "Dr. Anjani Kumar", "designation": "Senior Medical Officer, MBBS", "district": "Pithoragarh", "phone": "9415788771", "email": "doctoranjani@gmail.com", "spec": "General Medicine"},
    {"name": "Dr. Shailendra Pratap Singh", "designation": "Senior Medical Officer", "district": "Pauri Garhwal", "phone": "9415623101", "email": "shailendra.ps@neuralclinic.in", "spec": "General Medicine"},
    {"name": "Dr. K.C. Pandey", "designation": "Epidemiologist", "district": "Bageshwar", "phone": "9559172171", "email": "drkcpandey40@gmail.com", "spec": "Epidemiology"},
    {"name": "Dr. Rajesh Kumar Arya", "designation": "MO I/C PHC Lamgara", "district": "Almora", "phone": "9410364519", "email": "lamgaraphc123@gmail.com", "spec": "General Medicine"},
    {"name": "Dr. Ajay Mohan Sharma", "designation": "Sr. Pathologist, MO I/C CHC Jainti", "district": "Rudrapur, U.S. Nagar", "phone": "9756206298", "email": "amsharmadr@gmail.com", "spec": "Pathology"},
    {"name": "Dr. M.S. Bohra", "designation": "Sr. Child Specialist", "district": "Nainital", "phone": "9412123249", "email": "drmsbohra@gmail.com", "spec": "Pediatrics"},
    {"name": "Dr. Vinesh Kumar Saxena", "designation": "Add. C.M.O.", "district": "Bageshwar", "phone": "9412441067", "email": "vinesh.saxena47@gmail.com", "spec": "General Medicine"},
]

DEFAULT_PASSWORD = "Doctor@123"

def seed():
    conn = get_db_connection()
    if not conn:
        print("ERROR: Cannot connect to database!")
        return
    
    cursor = conn.cursor(dictionary=True)
    hashed_pw = bcrypt.generate_password_hash(DEFAULT_PASSWORD).decode('utf-8')
    
    inserted = 0
    skipped = 0
    
    for doc in DOCTORS:
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (doc['email'],))
        if cursor.fetchone():
            print(f"  SKIP (exists): {doc['name']} ({doc['email']})")
            skipped += 1
            continue
        
        # Generate RSA keys
        private_pem, public_pem = generate_rsa_keypair()
        private_key_encrypted = encrypt_data(private_pem)
        
        # Insert into users table
        cursor.execute('''
            INSERT INTO users (fullName, email, password, role, mobile, city, state, rsaPublicKey, rsaPrivateKeyEncrypted)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            doc['name'], doc['email'], hashed_pw, 'doctor',
            doc['phone'], doc['district'], 'Uttarakhand',
            public_pem, private_key_encrypted
        ))
        user_id = cursor.lastrowid
        
        # Determine degree from designation
        degree = "MBBS"
        if "BHMS" in doc['designation'].upper():
            degree = "BHMS, MPH"
        elif "PROFESSOR" in doc['designation'].upper():
            degree = "MD"
        elif "SR." in doc['designation'].upper() or "SENIOR" in doc['designation'].upper():
            degree = "MD"
        
        # Determine experience
        exp_map = {
            "Professor": "20+ yrs", "Sr.": "15+ yrs", "Senior": "15+ yrs",
            "Assistant Professor": "10+ yrs", "ACMO": "12+ yrs",
        }
        experience = "10+ yrs"
        for key, val in exp_map.items():
            if key.lower() in doc['designation'].lower():
                experience = val
                break
        
        # Insert into doctor_details
        cursor.execute('''
            INSERT INTO doctor_details (userId, degree, position, specialization, experience, hospital)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            user_id, degree, doc['designation'], doc['spec'],
            experience, f"District Hospital, {doc['district']}"
        ))
        
        inserted += 1
        print(f"  OK: {doc['name']} | {doc['spec']} | {doc['district']}")
    
    conn.commit()
    conn.close()
    
    print(f"\n{'='*50}")
    print(f"DONE! Inserted: {inserted} | Skipped: {skipped} | Total: {len(DOCTORS)}")
    print(f"Default login password for all doctors: {DEFAULT_PASSWORD}")

if __name__ == '__main__':
    seed()
