# Usa una imagen oficial de Python
FROM python:3.10-slim

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos al contenedor
COPY . .

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto 8000 para Flask
EXPOSE 5000

ENV COM_MODEL=COM-3.0.keras

# Comando para correr la app
CMD ["python", "-m", "flask","--app", "src/board", "run","--host=0.0.0.0","--debug"]
