# Dockerfile
FROM python:3.12-slim

# محیط کاری
WORKDIR /app

# کپی فایل‌های requirements
COPY requirements.txt .

# نصب پکیج‌ها
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# کپی پروژه
COPY . .

# محیط متغیر (اختیاری)
ENV PYTHONUNBUFFERED=1

# فرمان پیش‌فرض
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
