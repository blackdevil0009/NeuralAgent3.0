from datetime import datetime, timezone
from app.extensions import db

class PatientSubscription(db.Model):
    __tablename__ = 'patient_subscriptions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    plan_name = db.Column(db.String(50), nullable=False) # 'Basic', 'Standard', 'Premium'
    amount = db.Column(db.Integer, nullable=False) # in paise
    status = db.Column(
        db.Enum('active', 'expired', 'cancelled', 'pending', name='sub_status'),
        nullable=False, default='pending'
    )
    
    start_date = db.Column(db.DateTime(timezone=True), nullable=True)
    end_date = db.Column(db.DateTime(timezone=True), nullable=True)
    
    razorpay_order_id = db.Column(db.String(100), nullable=False, unique=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'planName': self.plan_name,
            'amount': self.amount,
            'status': self.status,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'razorpayOrderId': self.razorpay_order_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
