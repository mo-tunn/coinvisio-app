# Use official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory to /app
WORKDIR /app

# Install system dependencies
# build-essential is often needed for compiling some python libs (like numpy/pandas extensions)
# git is needed to install pandas-ta from source
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
# We copy this first to leverage Docker cache
COPY deployment/requirements.txt /app/requirements.txt

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project directory into the container
COPY . /app

# Define environment variables
# (These should be set in HF Spaces secrets, but defaults help avoid crash on build)
ENV PYTHONUNBUFFERED=1

# Run worker.py when the container launches
# Note: worker.py is in deployment/ folder, but we copied everything to /app
CMD ["python", "deployment/worker.py"]
