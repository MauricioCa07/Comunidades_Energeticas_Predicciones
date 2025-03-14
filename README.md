# Proyecto P2


## Configuración
1. Clonar el repositorio
2. Crear un entorno virtual: `python 3.11 -m venv env`
3. Activar el entorno virtual
4. Instalar dependencias: `pip install -r requirements.txt`

> Debes tener en cuanta que en la primera ejecucion deberas generar el dataset


## Si quieres reentrenar el modelo manulmente
- Debes saber que para esto en las variables de entorno debes establecer 
  el nombre del modelo actual que se tenga 


## Para iniciar el servidor 

```
python -m flask --app proyecto_p2/src/board run --port 8000 --debug
```
