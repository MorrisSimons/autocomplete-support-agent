#!/bin/bash

echo "🔨 Building React Component..."

# Go to the frontend directory
cd custom_text_input/component/frontend

# Set Node.js options to handle OpenSSL compatibility
export NODE_OPTIONS="--openssl-legacy-provider"

# Run the build
echo "📦 Running npm build..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful! Component is ready."
    echo "🚀 You can now run: streamlit run app.py"
else
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi
