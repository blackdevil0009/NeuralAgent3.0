/**
 * AppointmentReceipt.jsx — Client-Side PDF Receipt Generator
 *
 * Uses jsPDF to generate a branded appointment receipt PDF directly in the browser.
 * This is both a standalone component AND a utility function used by the
 * Appointments page for the Download button.
 */

import jsPDF from 'jspdf';

// ── Brand colours ─────────────────────────────────────────────
const BRAND_GREEN  = [45, 106, 79];
const BRAND_DARK   = [13, 36, 16];
const LIGHT_GREEN  = [232, 245, 233];
const GREY_TEXT    = [95, 99, 104];
const WHITE        = [255, 255, 255];
const SUCCESS_GRN  = [39, 174, 96];
const FAIL_RED     = [192, 57, 43];
const BORDER_GREY  = [218, 220, 224];

/**
 * Generate and download a PDF receipt for a confirmed appointment.
 *
 * @param {Object} appointment - Appointment dict (from API)
 * @param {Object} patient     - Patient user dict
 * @param {Object} doctorInfo  - Doctor user dict (optional, fallback to appointment fields)
 */
export function generateReceiptPDF(appointment, patient = {}, doctorInfo = {}) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const pageW = 210;
    const margin = 15;
    const colW = pageW - margin * 2;
    let y = 0;

    // ── Helpers ───────────────────────────────────────────────
    const rgb = (arr) => `rgb(${arr.join(',')})`;

    function rect(x, yy, w, h, fillRgb) {
        doc.setFillColor(...fillRgb);
        doc.rect(x, yy, w, h, 'F');
    }

    function text(str, x, yy, opts = {}) {
        const { size = 10, bold = false, color = BRAND_DARK, align = 'left' } = opts;
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        doc.text(String(str || '—'), x, yy, { align });
    }

    function sectionHeader(label, yy) {
        doc.setFillColor(...LIGHT_GREEN);
        doc.rect(margin, yy, colW, 7, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND_GREEN);
        doc.text(label, margin + 3, yy + 5);
        return yy + 10;
    }

    function infoRow(label, value, yy, shade = false) {
        if (shade) {
            doc.setFillColor(...LIGHT_GREEN);
            doc.rect(margin, yy - 4, 55, 7, 'F');
        }
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GREY_TEXT);
        doc.text(label, margin + 2, yy);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BRAND_DARK);
        doc.text(String(value || '—'), margin + 58, yy);
        // thin border line
        doc.setDrawColor(...BORDER_GREY);
        doc.setLineWidth(0.2);
        doc.line(margin, yy + 2, margin + colW, yy + 2);
        return yy + 8;
    }

    // ─────────────────────────────────────────────────────────
    //  HEADER
    // ─────────────────────────────────────────────────────────
    rect(0, 0, 210, 26, BRAND_GREEN);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('🌿 VaidyaMed-X', 105, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(185, 224, 196);
    doc.text('Official Appointment Confirmation Receipt', 105, 20, { align: 'center' });

    rect(0, 26, 210, 14, BRAND_DARK);
    y = 26;

    // ── Payment Status badge ──────────────────────────────────
    const paid = (appointment.paymentStatus || appointment.payment_status || 'pending') === 'paid';
    const badgeColor = paid ? SUCCESS_GRN : FAIL_RED;
    rect(0, 26, 210, 12, badgeColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    const statusLabel = paid ? '✅  PAYMENT CONFIRMED' : '⚠️  PAYMENT PENDING';
    doc.text(statusLabel, 105, 34, { align: 'center' });
    y = 44;

    // ─────────────────────────────────────────────────────────
    //  BOOKING REFERENCE
    // ─────────────────────────────────────────────────────────
    y = sectionHeader('📋  Booking Reference', y);
    const apptId = appointment.id || appointment.appointmentId;
    const txnId  = appointment.transactionId || appointment.razorpayPaymentId || appointment.razorpay_payment_id || 'N/A';
    const createdAt = (appointment.createdAt || appointment.created_at || '').replace('T', ' ').slice(0, 19);
    y = infoRow('Appointment ID',     `APT-${String(apptId).padStart(5, '0')}`, y, true);
    y = infoRow('Transaction ID',     txnId, y, false);
    y = infoRow('Booking Timestamp',  createdAt + ' UTC', y, true);
    y += 3;

    // ─────────────────────────────────────────────────────────
    //  PATIENT DETAILS
    // ─────────────────────────────────────────────────────────
    y = sectionHeader('👤  Patient Details', y);
    y = infoRow('Full Name',  patient.name  || appointment.patientName || 'N/A', y, true);
    y = infoRow('Email',      patient.email || 'N/A', y, false);
    y = infoRow('Mobile',     patient.mobile || 'Not provided', y, true);
    y = infoRow('City',       patient.city  || 'Not provided', y, false);
    y += 3;

    // ─────────────────────────────────────────────────────────
    //  DOCTOR DETAILS
    // ─────────────────────────────────────────────────────────
    y = sectionHeader('👨‍⚕️  Doctor Details', y);
    const doctorName   = appointment.doctorName || doctorInfo.name || 'N/A';
    const spec         = appointment.spec || doctorInfo.specialization || '';
    const degree       = appointment.doctorDegree || doctorInfo.degree || '';
    const hospital     = appointment.hospital || doctorInfo.hospital || '';
    const clinic       = appointment.clinicLocation || doctorInfo.clinicLocation || 'Online Consultation';
    const doctorMobile = appointment.doctorMobile || doctorInfo.mobile || 'Via Chat';

    y = infoRow('Doctor Name',    `Dr. ${doctorName}`, y, true);
    y = infoRow('Specialization', spec || 'N/A', y, false);
    y = infoRow('Degree',         degree || 'N/A', y, true);
    y = infoRow('Hospital',       hospital || 'N/A', y, false);
    y = infoRow('Clinic Address', clinic, y, true);
    y = infoRow('Doctor Contact', doctorMobile, y, false);
    y += 3;

    // ─────────────────────────────────────────────────────────
    //  APPOINTMENT DETAILS
    // ─────────────────────────────────────────────────────────
    y = sectionHeader('📅  Appointment Details', y);
    const aptDate = appointment.appointmentDate || appointment.appointment_date || '';
    const aptTime = (appointment.appointmentTime || appointment.appointment_time || '').slice(0, 5);
    const aptType = appointment.appointmentType || appointment.type || 'Chat Consultation';
    const purpose = appointment.purpose || appointment.notes || 'General Consultation';
    const status  = (appointment.status || 'confirmed').toUpperCase();

    y = infoRow('Date',               aptDate, y, true);
    y = infoRow('Time',               aptTime, y, false);
    y = infoRow('Consultation Type',  aptType, y, true);
    y = infoRow('Purpose / Reason',   purpose, y, false);
    y = infoRow('Appointment Status', status, y, true);
    y += 3;

    // ─────────────────────────────────────────────────────────
    //  PAYMENT SUMMARY
    // ─────────────────────────────────────────────────────────
    y = sectionHeader('💳  Payment Summary', y);
    const amountINR   = appointment.amountPaid || appointment.amount_paid || 0;
    const doctorShare  = appointment.doctorShareINR  || Math.round(amountINR * 0.95 * 100) / 100;
    const platShare    = appointment.platformShareINR || Math.round(amountINR * 0.05 * 100) / 100;

    y = infoRow('Consultation Fee',   `₹${Number(amountINR).toFixed(2)}`, y, true);
    y = infoRow('Doctor Share (95%)', `₹${Number(doctorShare).toFixed(2)}`, y, false);
    y = infoRow('Platform Fee (5%)',  `₹${Number(platShare).toFixed(2)}`, y, true);
    y = infoRow('Payment Method',     'Razorpay', y, false);
    y = infoRow('Transaction ID',     txnId, y, true);
    y += 3;

    // ── Total box ─────────────────────────────────────────────
    rect(margin, y, colW, 12, BRAND_GREEN);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(`Total Paid: ₹${Number(amountINR).toFixed(2)} INR`, 105, y + 8, { align: 'center' });
    y += 18;

    // ─────────────────────────────────────────────────────────
    //  FOOTER
    // ─────────────────────────────────────────────────────────
    doc.setDrawColor(...BORDER_GREY);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + colW, y);
    y += 5;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY_TEXT);
    doc.text(
        'This is a computer-generated receipt and does not require a physical signature.',
        105, y, { align: 'center' }
    );
    y += 5;
    doc.text(
        'VaidyaMed-X — Your trusted healthcare partner | support@vaidyamedx.com',
        105, y, { align: 'center' }
    );
    y += 5;
    const now = new Date().toUTCString();
    doc.text(`Generated: ${now}`, 105, y, { align: 'center' });

    // ── Save ─────────────────────────────────────────────────
    const filename = `VaidyaMedX_Receipt_APT${String(apptId).padStart(5, '0')}.pdf`;
    doc.save(filename);
}

export default generateReceiptPDF;
