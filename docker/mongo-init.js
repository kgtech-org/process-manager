// MongoDB initialization script for Process Manager
// This script is executed when MongoDB container starts for the first time

print('=== Process Manager MongoDB Initialization ===');

// Create the process_manager database
db = db.getSiblingDB('process_manager');

print('Creating process_manager database...');

// Create collections with validation schemas
print('Creating collections with validation schemas...');

// Users collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'role', 'active', 'created_at'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        name: { bsonType: 'string' },
        title: { bsonType: 'string' },
        department: { bsonType: 'string' },
        role: {
          bsonType: 'string',
          enum: ['admin', 'manager', 'technician', 'viewer']
        },
        active: { bsonType: 'bool' },
        created_at: { bsonType: 'date' },
        last_login_at: { bsonType: ['date', 'null'] }
      }
    }
  }
});

// Documents collection
db.createCollection('documents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['reference', 'title', 'version', 'status', 'created_by', 'created_at'],
      properties: {
        reference: { bsonType: 'string' },
        title: { bsonType: 'string' },
        version: { bsonType: 'string' },
        status: {
          bsonType: 'string',
          enum: ['draft', 'review', 'approved', 'archived']
        },
        created_by: { bsonType: 'objectId' },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' },
        approved_at: { bsonType: ['date', 'null'] }
      }
    }
  }
});

// Document permissions collection
db.createCollection('document_permissions');

// Invitations collection
db.createCollection('invitations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['document_id', 'inviter_id', 'invitee_email', 'token', 'status', 'sent_at', 'expires_at'],
      properties: {
        document_id: { bsonType: 'objectId' },
        inviter_id: { bsonType: 'objectId' },
        invitee_email: { bsonType: 'string' },
        invitee_id: { bsonType: ['objectId', 'null'] },
        permission: {
          bsonType: 'string',
          enum: ['read', 'write', 'sign']
        },
        role: {
          bsonType: 'string',
          enum: ['author', 'verifier', 'validator', 'collaborator']
        },
        token: { bsonType: 'string' },
        status: {
          bsonType: 'string',
          enum: ['pending', 'accepted', 'declined', 'expired', 'revoked']
        },
        sent_at: { bsonType: 'date' },
        accepted_at: { bsonType: ['date', 'null'] },
        expires_at: { bsonType: 'date' }
      }
    }
  }
});

// Activity logs collection
db.createCollection('activity_logs');

// Signatures collection
db.createCollection('signatures');

// Monthly bilans collection
db.createCollection('monthly_bilans');

// PDF exports collection
db.createCollection('pdf_exports');

// File attachments collection
db.createCollection('file_attachments');

print('Creating indexes...');

// Users indexes
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'role': 1 });
db.users.createIndex({ 'department': 1 });
db.users.createIndex({ 'active': 1 });

// Documents indexes
db.documents.createIndex({ 'reference': 1 }, { unique: true });
db.documents.createIndex({ 'status': 1 });
db.documents.createIndex({ 'created_by': 1 });
db.documents.createIndex({ 'created_at': -1 });
db.documents.createIndex({ 'title': 'text' }); // Text search

// Document permissions indexes
db.document_permissions.createIndex({ 'document_id': 1, 'user_id': 1 }, { unique: true });
db.document_permissions.createIndex({ 'user_id': 1 });
db.document_permissions.createIndex({ 'status': 1 });

// Invitations indexes
db.invitations.createIndex({ 'token': 1 }, { unique: true });
db.invitations.createIndex({ 'document_id': 1 });
db.invitations.createIndex({ 'invitee_email': 1 });
db.invitations.createIndex({ 'status': 1 });
db.invitations.createIndex({ 'expires_at': 1 });

// Activity logs indexes
db.activity_logs.createIndex({ 'document_id': 1, 'timestamp': -1 });
db.activity_logs.createIndex({ 'user_id': 1, 'timestamp': -1 });
db.activity_logs.createIndex({ 'action': 1 });

// Signatures indexes
db.signatures.createIndex({ 'document_id': 1, 'user_id': 1 });
db.signatures.createIndex({ 'signature_type': 1 });
db.signatures.createIndex({ 'status': 1 });

// Monthly bilans indexes
db.monthly_bilans.createIndex({ 'year': 1, 'month': 1, 'process_reference': 1 }, { unique: true });
db.monthly_bilans.createIndex({ 'uploaded_at': -1 });

// PDF exports indexes
db.pdf_exports.createIndex({ 'document_id': 1, 'generated_at': -1 });
db.pdf_exports.createIndex({ 'status': 1 });

// File attachments indexes
db.file_attachments.createIndex({ 'uploaded_by': 1 });
db.file_attachments.createIndex({ 'uploaded_at': -1 });

print('Creating default admin user...');

// Create default admin user
db.users.insertOne({
  email: 'admin@togocom.tg',
  name: 'System Administrator',
  title: 'System Administrator',
  department: 'IT',
  role: 'admin',
  active: true,
  created_at: new Date(),
  last_login_at: null
});

print('=== Process Manager MongoDB Initialization Complete ===');
print('Database: process_manager');
print('Collections created: users, documents, document_permissions, invitations, activity_logs, signatures, monthly_bilans, pdf_exports, file_attachments');
print('Default admin user created: admin@togocom.tg');
print('All indexes created successfully');