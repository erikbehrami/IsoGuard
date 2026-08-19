namespace IsoGuard.Api.Entities;

public enum UserRole { ADMIN, USER }
public enum ProfileStatus { ACTIVE, INACTIVE, BLOCKED }
public enum InvitationStatus { PENDING, ACCEPTED, EXPIRED, REVOKED }
public enum AccountStatus { ACTIVE, BLOCKED, CLOSED }
public enum AccountRequestStatus { PENDING, APPROVED, REJECTED }
public enum TransactionType { DEPOSIT, WITHDRAWAL, TRANSFER }
public enum TransactionStatus { COMPLETED, REJECTED }
public enum AnomalyReviewStatus { PENDING, NORMAL, CONFIRMED_SUSPICIOUS }
