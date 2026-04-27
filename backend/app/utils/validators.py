"""
app/utils/validators.py — Input Validation Schemas (Marshmallow)
"""

import re
from marshmallow import Schema, fields, validate, validates, ValidationError, pre_load, EXCLUDE

# ── Regex constants ──────────────────────────────────────────────
PHONE_RE    = re.compile(r'^[6-9]\d{9}$')
EMAIL_RE    = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
PIN_RE      = re.compile(r'^\d{6}$')
REG_NUM_RE  = re.compile(r'^[A-Z]{1,3}-?\d{5,10}$', re.IGNORECASE)
UPI_RE      = re.compile(r'^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$')
IFSC_RE     = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$', re.IGNORECASE)

DUMMY_WORDS = {'test','dummy','fake','abc','xyz','asdf','qwerty',
               'aaa','123','na','none','nil','null','temp','sample'}


def validate_phone(value):
    if not PHONE_RE.match(str(value)):
        raise ValidationError('Enter a valid 10-digit Indian mobile number (starts with 6-9).')


def validate_pin(value):
    if not PIN_RE.match(str(value)):
        raise ValidationError('Enter a valid 6-digit PIN code.')


def validate_address(value):
    low = value.strip().lower()
    if len(low) < 5:
        raise ValidationError('Address must be at least 5 characters.')
    if low in DUMMY_WORDS:
        raise ValidationError('Please enter a real address.')


# ── Patient Registration Schema ──────────────────────────────────
class PatientRegisterSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    fullName    = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email       = fields.Email(required=True)
    mobile      = fields.Str(required=True, validate=validate_phone)
    dob         = fields.Date(required=True, format='%Y-%m-%d')
    gender      = fields.Str(required=True,
                             validate=validate.OneOf(['male','female','other','prefer_not']))
    address     = fields.Str(required=True, validate=validate_address)
    city        = fields.Str(required=True, validate=validate.Length(min=2, max=60))
    state       = fields.Str(required=True, validate=validate.Length(min=2, max=60))
    pincode     = fields.Str(required=True, validate=validate_pin)
    password    = fields.Str(required=True, validate=validate.Length(min=8, max=128))
    role        = fields.Str(load_default='patient')
    termsAgreed = fields.Bool(required=True)

    @validates('termsAgreed')
    def must_agree(self, value):
        if not value:
            raise ValidationError('You must accept the Terms & Conditions.')

    @pre_load
    def sanitize(self, data, **kwargs):
        if 'email' in data and data['email']:
            data['email'] = data['email'].strip().lower()
        return data


# ── Doctor Registration Schema ───────────────────────────────────
class DoctorRegisterSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    fullName        = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email           = fields.Email(required=True)
    mobile          = fields.Str(required=True, validate=validate_phone)
    address         = fields.Str(required=True, validate=validate_address)
    city            = fields.Str(required=True, validate=validate.Length(min=2, max=60))
    state           = fields.Str(required=True, validate=validate.Length(min=2, max=60))
    pincode         = fields.Str(required=True, validate=validate_pin)
    degree          = fields.Str(required=True, validate=validate.Length(min=1))
    position        = fields.Str(required=True, validate=validate.Length(min=1))
    specialization  = fields.Str(required=True, validate=validate.Length(min=1))
    experience      = fields.Str(required=True)
    hospital        = fields.Str(required=True, validate=validate.Length(min=3, max=150))
    regNumber       = fields.Str(required=True)
    password        = fields.Str(required=True, validate=validate.Length(min=8, max=128))
    role            = fields.Str(load_default='doctor')
    termsAgreed     = fields.Bool(required=True)

    @validates('termsAgreed')
    def must_agree(self, value):
        if not value:
            raise ValidationError('You must accept the Terms & Conditions.')

    @validates('regNumber')
    def validate_reg_number(self, value):
        if not REG_NUM_RE.match(value.strip()):
            raise ValidationError('Invalid format. Use STATE-XXXXXX (e.g. MH-123456).')

    @pre_load
    def sanitize(self, data, **kwargs):
        if 'email' in data and data['email']:
            data['email'] = data['email'].strip().lower()
        return data


# ── Organization Registration Schema ─────────────────────────────
class OrganizationRegisterSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    hospitalName    = fields.Str(required=True, validate=validate.Length(min=2, max=150))
    adminName       = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email           = fields.Email(required=True)
    mobile          = fields.Str(required=True, validate=validate_phone)
    address         = fields.Str(required=True, validate=validate_address)
    city            = fields.Str(load_default='', allow_none=True)  # auto-filled by LocationPicker
    state           = fields.Str(load_default='', allow_none=True)
    pincode         = fields.Str(load_default='', allow_none=True)
    regNumber       = fields.Str(required=True, validate=validate.Length(min=2, max=50))
    hospitalType    = fields.Str(required=True,
                                 validate=validate.OneOf(['private','govt','clinic','ayurvedic']))
    password        = fields.Str(required=True, validate=validate.Length(min=8, max=128))
    role            = fields.Str(load_default='organization')
    # FormData sends booleans as strings — handle both
    termsAgreed     = fields.Str(load_default='false')

    @validates('termsAgreed')
    def must_agree(self, value):
        if str(value).lower() not in ('true', '1', 'yes', 'on'):
            raise ValidationError('You must accept the Terms & Conditions.')

    @pre_load
    def sanitize(self, data, **kwargs):
        if 'email' in data and data['email']:
            data['email'] = data['email'].strip().lower()
        return data


# ── Login Schema ─────────────────────────────────────────────────
class LoginSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email      = fields.Email(required=True)
    password   = fields.Str(required=True, validate=validate.Length(min=1))
    role       = fields.Str(load_default='patient',
                            validate=validate.OneOf(['patient','doctor','admin','organization']))
    rememberMe = fields.Bool(load_default=False)

    @pre_load
    def sanitize(self, data, **kwargs):
        if 'email' in data and data['email']:
            data['email'] = data['email'].strip().lower()
        return data


# ── OTP Verification Schema ──────────────────────────────────────
class OtpSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    otp   = fields.Str(required=True, validate=validate.Regexp(r'^\d{6}$',
                error='OTP must be a 6-digit number.'))
    role  = fields.Str(load_default='patient')


# ── Forgot Password Schema ──────────────────────────────────────
class ForgotPasswordSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)

    @pre_load
    def sanitize(self, data, **kwargs):
        if 'email' in data:
            data['email'] = data['email'].strip().lower()
        return data


# ── Reset Password Schema ─────────────────────────────────────────
class ResetPasswordSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    token    = fields.Str(required=True, validate=validate.Length(min=10))
    password = fields.Str(required=True, validate=validate.Length(min=8, max=128))


# ── Profile Update Schema (shared, role-aware) ───────────────────
class PatientProfileSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name    = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    mobile  = fields.Str(required=True, validate=validate_phone)
    address = fields.Str(validate=validate.Length(min=5))
    city    = fields.Str(validate=validate.Length(min=2, max=60))
    state   = fields.Str()
    pincode = fields.Str(validate=validate_pin)
    pin     = fields.Str(validate=validate_pin)  # alias for frontend

    bloodGroup  = fields.Str(allow_none=True)
    dosha       = fields.Str(allow_none=True)
    allergies   = fields.Str(allow_none=True)
    conditions  = fields.Str(allow_none=True)
    medications = fields.Str(allow_none=True)


class DoctorProfileSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name            = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    mobile          = fields.Str(required=True, validate=validate_phone)
    address         = fields.Str(validate=validate.Length(min=5))
    city            = fields.Str(validate=validate.Length(min=2, max=60))
    state           = fields.Str()
    pin             = fields.Str(validate=validate_pin)
    degree          = fields.Str()
    position        = fields.Str()
    specialization  = fields.Str()
    experience      = fields.Str()
    hospital        = fields.Str(validate=validate.Length(min=3))
    regNumber       = fields.Str()
    consultantFee   = fields.Int(validate=validate.Range(min=0, max=100000))
    workingHours    = fields.Str(validate=validate.Length(min=3, max=100))
    upiId           = fields.Str(allow_none=True)
    bankAccountName = fields.Str(allow_none=True)
    bankAccountNumber = fields.Str(allow_none=True)
    bankIfsc        = fields.Str(allow_none=True)


class OrganizationProfileSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    hospitalName = fields.Str(required=True, validate=validate.Length(min=2, max=150))
    adminName    = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    mobile       = fields.Str(required=True, validate=validate_phone)
    address      = fields.Str(required=True, validate=validate_address)
    city         = fields.Str(required=True, validate=validate.Length(min=2, max=60))
    state        = fields.Str(required=True, validate=validate.Length(min=2, max=60))
    pincode      = fields.Str(required=True, validate=validate_pin)
    regNumber    = fields.Str(required=True, validate=validate.Length(min=2, max=50))
    hospitalType = fields.Str(
        required=True,
        validate=validate.OneOf(['private', 'govt', 'clinic', 'ayurvedic'])
    )
