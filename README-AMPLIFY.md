# HashPass BSL2025 - Amplify Deployment Guide

This guide explains how to deploy the HashPass BSL2025 application to AWS Amplify, including the agenda monitoring service as a serverless Lambda function.

## 🚀 Amplify vs Traditional Server Deployment

### **Traditional Server (Current Setup)**
- ✅ Full systemd service control
- ✅ Persistent background processes
- ✅ Direct file system access
- ✅ Root privileges for system management
- ❌ Requires dedicated server/VPS
- ❌ Manual scaling and maintenance

### **AWS Amplify (Serverless)**
- ✅ Fully managed serverless hosting
- ✅ Automatic scaling
- ✅ No server maintenance
- ✅ Built-in CI/CD
- ✅ Lambda functions for background tasks
- ❌ No persistent processes
- ❌ Limited to serverless functions
- ❌ No root access

## 📋 Prerequisites

### 1. AWS Account Setup
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

### 2. Amplify CLI Setup
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure
# Follow the setup wizard
```

### 3. Project Dependencies
```bash
# Install project dependencies
npm install
```

## 🛠️ Deployment Options

### Option 1: Automated Deployment (Recommended)
```bash
# Setup Parameter Store first
npm run parameters:setup

# Deploy everything to Amplify
./scripts/amplify-deploy.sh all

# Or use npm scripts
npm run deploy:amplify
```

### Option 2: Manual Step-by-Step
```bash
# 1. Setup Parameter Store
npm run parameters:setup

# 2. Build the web application
npm run build:web

# 3. Deploy Lambda functions
amplify push

# 4. Deploy everything to Amplify
amplify publish
```

### Option 3: Individual Components
```bash
# Deploy only Lambda functions
./scripts/amplify-deploy.sh lambda

# Deploy only web app
./scripts/amplify-deploy.sh web

# Test Lambda function
./scripts/amplify-deploy.sh test
```

## 📁 Amplify Project Structure

```
amplify/
├── backend/
│   ├── function/
│   │   └── agendaMonitor/           # Lambda function for agenda monitoring
│   │       ├── src/
│   │       │   └── index.js         # Main Lambda handler
│   │       ├── package.json         # Lambda dependencies
│   │       └── agendaMonitor-cloudformation-template.json
│   └── backend-config.json          # Amplify backend configuration
└── # ... other Amplify files
```

## ⚡ Lambda Function Details

### **Function Configuration**
- **Runtime**: Node.js 18.x
- **Memory**: 512 MB
- **Timeout**: 5 minutes
- **Schedule**: Every 5 minutes (EventBridge rule)
- **Environment**: Production Supabase credentials

### **Function Features**
- ✅ Web scraping of BSL2025 agenda
- ✅ Change detection using MD5 hashing
- ✅ Automatic database updates
- ✅ Comprehensive logging
- ✅ Error handling and fallbacks
- ✅ Event date validation

### **Monitoring**
```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/agendaMonitor

# Test Lambda function
npm run lambda:test

# View Amplify logs
amplify logs
```

## 🔧 Configuration

### Environment Variables
The Lambda function uses these environment variables:
- `SUPABASE_URL_PARAMETER`: Parameter Store path for Supabase URL
- `SUPABASE_KEY_PARAMETER`: Parameter Store path for Supabase service role key
- `ENV`: Environment (dev/prod)
- `REGION`: AWS region

### Secure Credential Management
Credentials are stored securely in AWS Systems Manager Parameter Store:
- **Supabase URL**: `/hashpass/bsl2025/supabase/url` (String)
- **Service Role Key**: `/hashpass/bsl2025/supabase/service-role-key` (SecureString - encrypted)

### EventBridge Schedule
The Lambda function is triggered by EventBridge every 5 minutes:
```json
{
  "ScheduleExpression": "rate(5 minutes)",
  "State": "ENABLED"
}
```

## 📊 Monitoring and Logs

### CloudWatch Logs
```bash
# View recent logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/agendaMonitor \
  --start-time $(date -d '1 hour ago' +%s)000

# Follow logs in real-time
aws logs tail /aws/lambda/agendaMonitor --follow
```

### Amplify Console
```bash
# Open Amplify console
amplify console

# View deployment history
amplify status
```

## 🚨 Troubleshooting

### Common Issues

1. **Lambda Function Not Triggering**
   ```bash
   # Check EventBridge rule
   aws events list-rules --name-prefix agendaMonitor
   
   # Check Lambda permissions
   aws lambda get-policy --function-name agendaMonitor
   ```

2. **Database Connection Issues**
   ```bash
   # Test Supabase connection
   npm run lambda:test
   
   # Check environment variables
   aws lambda get-function-configuration --function-name agendaMonitor
   ```

3. **Build Failures**
   ```bash
   # Check Amplify build logs
   amplify logs
   
   # Rebuild from scratch
   amplify env pull
   amplify push
   ```

### Debug Mode
```bash
# Test Lambda with force mode
aws lambda invoke \
  --function-name agendaMonitor \
  --payload '{"force": true, "debug": true}' \
  response.json
```

## 🔄 CI/CD Integration

### GitHub Actions (Example)
```yaml
name: Deploy to Amplify
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run deploy:amplify
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 📈 Scaling and Performance

### Automatic Scaling
- **Lambda**: Automatically scales based on demand
- **Amplify**: CDN distribution for global performance
- **Database**: Supabase handles scaling automatically

### Cost Optimization
- **Lambda**: Pay only for execution time (5-minute intervals)
- **Amplify**: Free tier includes 1000 build minutes/month
- **EventBridge**: Free tier includes 1M events/month

## 🔐 Security

### IAM Roles
The Lambda function uses a minimal IAM role with permissions for:
- CloudWatch Logs (write)
- Supabase API access (via environment variables)

### Environment Variables
- Sensitive data stored in AWS Systems Manager Parameter Store
- No hardcoded credentials in code
- Automatic rotation support

## 📞 Support

### Useful Commands
```bash
# Parameter Store management
npm run parameters:setup    # Setup parameters
npm run parameters:verify   # Verify parameters
npm run parameters:list     # List parameters

# Amplify management
amplify status              # Check deployment status
amplify env list           # View all resources
amplify delete             # Remove deployment
amplify help               # Get help

# Lambda testing
npm run lambda:test        # Test Lambda function
```

### Resources
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)

---

**Note**: This Amplify deployment is ideal for production environments where you want fully managed, serverless infrastructure with automatic scaling and no server maintenance.
