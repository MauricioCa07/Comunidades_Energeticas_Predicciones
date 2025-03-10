import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import *
from tensorflow.keras.callbacks import ModelCheckpoint
from tensorflow.keras.losses import MeanSquaredError
from tensorflow.keras.metrics import RootMeanSquaredError
from tensorflow.keras.optimizers import Adam
from utilities import mv,rename_model,set_enviroment_var,get_enviroment_var


project_path = "/home/laptop1/Desktop/codes/proyecto_p2/"
df_position = project_path + "models_media/processed_datasets/"
past_models = project_path + "past_models/"


def load_datasets():
    x_train = np.load(df_position + "x_train.npy")
    y_train = np.load(df_position + "y_train.npy")
    x_val = np.load(df_position + "x_val.npy")
    y_val = np.load(df_position + "y_val.npy")

    return x_train,y_train,x_val,y_val


def creating_model(model_to_generate,x_train,y_train,x_val,y_val):
    model1 = Sequential()
    model1.add(InputLayer((47, 1)))
    model1.add(LSTM(512))
    model1.add(Dense(16, 'relu'))
    model1.add(Dense(1, 'linear'))

    cp = ModelCheckpoint(model_to_generate, save_best_only=True)
    model1.compile(loss=MeanSquaredError(), optimizer=Adam(learning_rate=0.000001), metrics=[RootMeanSquaredError()])
    model1.fit(x_train, y_train, validation_data=(x_val, y_val), epochs=50, callbacks=[cp])


def manual_training():
    actual_model = get_enviroment_var("COM_MODEL")
    x_train,y_train,x_val,y_val = load_datasets()
    mv(project_path+actual_model,project_path + "past_models/"+actual_model)
    new_model_name = rename_model(actual_model,True)
    set_enviroment_var("COM_MODEL",new_model_name)
    creating_model(project_path+get_enviroment_var("COM_MODEL"),x_train,y_train,x_val,y_val)


def auto_training():
    actual_model = get_enviroment_var("COM_MODEL")
    x_train,y_train,x_val,y_val = load_datasets()
    mv(project_path+actual_model,project_path + "past_models/"+actual_model)
    new_model_name = rename_model(actual_model,False)
    set_enviroment_var("COM_MODEL",new_model_name)
    creating_model(project_path+get_enviroment_var("COM_MODEL"),x_train,y_train,x_val,y_val)




manual_training()