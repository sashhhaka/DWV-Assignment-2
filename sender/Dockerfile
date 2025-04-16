FROM python:3.9-slim
WORKDIR /sender
COPY requirements.txt /sender/
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY . /sender/
CMD ["python", "send_packages.py"]
