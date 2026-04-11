"""
app/services/pdf_service.py — Appointment Receipt PDF Generator

Generates a branded, professional PDF receipt for confirmed appointments.
Uses ReportLab for production PDF generation.
"""

import io
import logging
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)

# ── Brand Colours ─────────────────────────────────────────────
BRAND_GREEN  = colors.HexColor('#2d6a4f')
BRAND_DARK   = colors.HexColor('#0d2410')
BRAND_LIGHT  = colors.HexColor('#e8f5e9')
ACCENT_BLUE  = colors.HexColor('#1565c0')
GREY_TEXT    = colors.HexColor('#5f6368')
BORDER_GREY  = colors.HexColor('#dadce0')
SUCCESS_GRN  = colors.HexColor('#27ae60')
FAIL_RED     = colors.HexColor('#c0392b')
WHITE        = colors.white


def generate_appointment_receipt(appointment: dict, patient: dict, doctor: dict) -> bytes:
    """
    Generate a PDF appointment receipt.

    Args:
        appointment: dict from Appointment.to_dict(include_sensitive=True)
        patient:     dict from User.to_dict() for patient
        doctor:      dict from User.to_dict() for doctor

    Returns:
        bytes: PDF binary content ready for streaming.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=18*mm,
        bottomMargin=18*mm,
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Header ────────────────────────────────────────────────
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=WHITE,
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        'SubHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#b9e0c4'),
        alignment=TA_CENTER,
    )

    # Header block as a table with coloured background
    appt_id    = appointment.get('id', 'N/A')
    txn_id     = appointment.get('transactionId') or appointment.get('razorpayPaymentId') or 'N/A'
    pay_status = (appointment.get('paymentStatus') or 'pending').upper()

    header_data = [[
        Paragraph('🌿 VaidyaMed-X', header_style),
    ]]
    header_sub_data = [[
        Paragraph('Official Appointment Confirmation Receipt', sub_style),
    ]]

    header_tbl = Table(header_data, colWidths=[170*mm])
    header_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_GREEN),
        ('TOPPADDING',    (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [6]),
    ]))
    story.append(header_tbl)

    sub_tbl = Table(header_sub_data, colWidths=[170*mm])
    sub_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_DARK),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
    ]))
    story.append(sub_tbl)
    story.append(Spacer(1, 8*mm))

    # ── Payment Status Badge ──────────────────────────────────
    badge_color = SUCCESS_GRN if pay_status == 'PAID' else FAIL_RED
    badge_style = ParagraphStyle(
        'Badge',
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=WHITE,
        alignment=TA_CENTER,
    )
    badge_tbl = Table([[Paragraph(
        f'✅ PAYMENT {pay_status}' if pay_status == 'PAID' else f'⚠️ PAYMENT {pay_status}',
        badge_style
    )]], colWidths=[170*mm])
    badge_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), badge_color),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [badge_color]),
    ]))
    story.append(badge_tbl)
    story.append(Spacer(1, 7*mm))

    # ── Helper styles ─────────────────────────────────────────
    label_style = ParagraphStyle(
        'Label', fontName='Helvetica-Bold', fontSize=9,
        textColor=GREY_TEXT, alignment=TA_LEFT,
    )
    value_style = ParagraphStyle(
        'Value', fontName='Helvetica', fontSize=10,
        textColor=BRAND_DARK, alignment=TA_LEFT,
    )
    section_style = ParagraphStyle(
        'Section', fontName='Helvetica-Bold', fontSize=11,
        textColor=BRAND_GREEN, spaceBefore=6, spaceAfter=4,
    )

    def info_row(label, value):
        return [Paragraph(label, label_style), Paragraph(str(value or '—'), value_style)]

    col_w = [60*mm, 110*mm]

    # ── Booking Reference ─────────────────────────────────────
    story.append(Paragraph('📋 Booking Reference', section_style))
    ref_data = [
        info_row('Appointment ID',    f'APT-{appt_id:05d}' if isinstance(appt_id, int) else appt_id),
        info_row('Transaction ID',    txn_id),
        info_row('Booking Timestamp', appointment.get('createdAt', '')[:19].replace('T', ' ') + ' UTC'),
        info_row('Booked On',         datetime.now(timezone.utc).strftime('%d %B %Y, %I:%M %p UTC')),
    ]
    ref_tbl = Table(ref_data, colWidths=col_w)
    ref_tbl.setStyle(_info_table_style())
    story.append(ref_tbl)
    story.append(Spacer(1, 5*mm))

    # ── Patient Details ───────────────────────────────────────
    story.append(Paragraph('👤 Patient Details', section_style))
    patient_data = [
        info_row('Full Name',    patient.get('name', '')),
        info_row('Email',        patient.get('email', '')),
        info_row('Mobile',       patient.get('mobile', '') or 'Not provided'),
        info_row('City',         patient.get('city', '') or 'Not provided'),
    ]
    pat_tbl = Table(patient_data, colWidths=col_w)
    pat_tbl.setStyle(_info_table_style())
    story.append(pat_tbl)
    story.append(Spacer(1, 5*mm))

    # ── Doctor Details ────────────────────────────────────────
    story.append(Paragraph('👨‍⚕️ Doctor Details', section_style))
    doctor_data = [
        info_row('Doctor Name',    f"Dr. {appointment.get('doctorName', doctor.get('name', ''))}"),
        info_row('Specialization', appointment.get('spec', doctor.get('specialization', ''))),
        info_row('Degree',         appointment.get('doctorDegree', doctor.get('degree', ''))),
        info_row('Hospital',       appointment.get('hospital', doctor.get('hospital', ''))),
        info_row('Clinic Address', appointment.get('clinicLocation', doctor.get('clinicLocation', '')) or 'Online Consultation'),
        info_row('Doctor Contact', appointment.get('doctorMobile', doctor.get('mobile', '')) or 'Via Chat'),
    ]
    doc_tbl = Table(doctor_data, colWidths=col_w)
    doc_tbl.setStyle(_info_table_style())
    story.append(doc_tbl)
    story.append(Spacer(1, 5*mm))

    # ── Appointment Details ───────────────────────────────────
    story.append(Paragraph('📅 Appointment Details', section_style))
    apt_date = appointment.get('appointmentDate', '')
    apt_time = appointment.get('appointmentTime', '')[:5] if appointment.get('appointmentTime') else ''
    appt_data = [
        info_row('Date',                 apt_date),
        info_row('Time',                 apt_time),
        info_row('Consultation Type',    appointment.get('appointmentType', '')),
        info_row('Purpose / Reason',     appointment.get('purpose', '') or appointment.get('notes', '') or 'General Consultation'),
        info_row('Appointment Status',   appointment.get('status', '').upper()),
    ]
    apt_tbl = Table(appt_data, colWidths=col_w)
    apt_tbl.setStyle(_info_table_style())
    story.append(apt_tbl)
    story.append(Spacer(1, 5*mm))

    # ── Payment Summary ───────────────────────────────────────
    story.append(Paragraph('💳 Payment Summary', section_style))
    amount_inr    = appointment.get('amountPaid', 0)
    doctor_share  = appointment.get('doctorShareINR', round(amount_inr * 0.95, 2))
    platform_share = appointment.get('platformShareINR', round(amount_inr * 0.05, 2))

    pay_data = [
        info_row('Consultation Fee',  f'₹{amount_inr:.2f}'),
        info_row('Doctor Share (95%)', f'₹{doctor_share:.2f}'),
        info_row('Platform Fee (5%)', f'₹{platform_share:.2f}'),
        info_row('Payment Status',    pay_status),
        info_row('Payment Gateway',   'Razorpay'),
        info_row('Transaction ID',    txn_id),
    ]
    pay_tbl = Table(pay_data, colWidths=col_w)
    pay_tbl.setStyle(_info_table_style(highlight_last=False))
    story.append(pay_tbl)
    story.append(Spacer(1, 8*mm))

    # ── Total Amount (large) ──────────────────────────────────
    total_style = ParagraphStyle(
        'Total', fontName='Helvetica-Bold', fontSize=14,
        textColor=WHITE, alignment=TA_CENTER,
    )
    total_tbl = Table(
        [[Paragraph(f'Total Paid: ₹{amount_inr:.2f} INR', total_style)]],
        colWidths=[170*mm]
    )
    total_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_GREEN),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(total_tbl)
    story.append(Spacer(1, 8*mm))

    # ── Footer ────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER_GREY))
    story.append(Spacer(1, 4*mm))
    footer_style = ParagraphStyle(
        'Footer', fontName='Helvetica', fontSize=8,
        textColor=GREY_TEXT, alignment=TA_CENTER, leading=14,
    )
    story.append(Paragraph(
        'This is a computer-generated receipt and does not require a physical signature.<br/>'
        'VaidyaMed-X — Your trusted healthcare partner | support@vaidyamedx.com<br/>'
        f'Generated: {datetime.now(timezone.utc).strftime("%d %B %Y at %I:%M %p UTC")}',
        footer_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    logger.info(f"PDF receipt generated for appointment {appt_id}, size={len(pdf_bytes)} bytes")
    return pdf_bytes


def _info_table_style(highlight_last=False):
    """Return standard table style for info rows."""
    base = [
        ('BACKGROUND', (0, 0), (0, -1), BRAND_LIGHT),   # label column light green
        ('BACKGROUND', (1, 0), (1, -1), WHITE),
        ('FONTNAME',   (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',   (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE',   (0, 0), (-1, -1), 9),
        ('TEXTCOLOR',  (0, 0), (0, -1), GREY_TEXT),
        ('TEXTCOLOR',  (1, 0), (1, -1), BRAND_DARK),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('GRID',       (0, 0), (-1, -1), 0.5, BORDER_GREY),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
    ]
    return TableStyle(base)
