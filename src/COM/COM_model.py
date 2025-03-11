import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, InputLayer, Dropout, BatchNormalization
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from tensorflow.keras.losses import MeanSquaredError
from tensorflow.keras.metrics import RootMeanSquaredError
from tensorflow.keras.optimizers import Adam
from utilities import mv, rename_model, set_enviroment_var, get_enviroment_var

project_path = "/home/laptop1/Desktop/codes/proyecto_p2/"
df_position = project_path + "models_media/processed_datasets/"
past_models = project_path + "past_models/"

def load_datasets():
    x_train = np.load(df_position + "x_train.npy")
    y_train = np.load(df_position + "y_train.npy")
    x_val = np.load(df_position + "x_val.npy")
    y_val = np.load(df_position + "y_val.npy")
    return x_train, y_train, x_val, y_val

def creating_model(model_to_generate, x_train, y_train, x_val, y_val):
    # Create a more complex model
    model1 = Sequential()
    model1.add(InputLayer((47, 1)))
    
    # First LSTM layer with return_sequences=True to stack another LSTM
    model1.add(LSTM(256, return_sequences=True))
    model1.add(BatchNormalization())
    model1.add(Dropout(0.3))
    
    # Second LSTM layer
    model1.add(LSTM(512))
    model1.add(BatchNormalization())
    model1.add(Dropout(0.3))
    
    # Dense layers with increasing complexity
    model1.add(Dense(128, activation='relu'))
    model1.add(BatchNormalization())
    model1.add(Dropout(0.2))
    
    model1.add(Dense(64, activation='relu'))
    model1.add(BatchNormalization())
    model1.add(Dropout(0.2))
    
    model1.add(Dense(32, activation='relu'))
    model1.add(Dense(16, activation='relu'))
    model1.add(Dense(1, activation='linear'))
    
    # Create callbacks
    # Early stopping to prevent overfitting
    early_stopping = EarlyStopping(
        monitor='val_root_mean_squared_error',
        patience=10,
        restore_best_weights=True,
        verbose=1
    )
    
    # Model checkpoint to save the best model
    cp = ModelCheckpoint(
        model_to_generate, 
        save_best_only=True, 
        monitor='val_root_mean_squared_error', 
        verbose=1
    )
    
    # Compile with a lower learning rate for better convergence
    model1.compile(
        loss=MeanSquaredError(), 
        optimizer=Adam(learning_rate=0.0001), 
        metrics=[RootMeanSquaredError()]
    )
    
    # Fit the model with both callbacks
    history = model1.fit(
        x_train, y_train, 
        validation_data=(x_val, y_val), 
        epochs=100,  # Increased epochs since we have early stopping
        batch_size=32,  # Added batch size parameter
        callbacks=[cp, early_stopping],
        verbose=1
    )
    
    return model1, history

def manual_training():
    actual_model = get_enviroment_var("COM_MODEL")
    x_train, y_train, x_val, y_val = load_datasets()
    mv(project_path + actual_model, project_path + "past_models/" + actual_model)
    new_model_name = rename_model(actual_model, True)
    set_enviroment_var("COM_MODEL", new_model_name)
    model, history = creating_model(project_path + get_enviroment_var("COM_MODEL"), x_train, y_train, x_val, y_val)
    
    # Print final metrics
    print(f"Final validation RMSE: {min(history.history['val_root_mean_squared_error'])}")
    return model, history

def auto_training():
    actual_model = get_enviroment_var("COM_MODEL")
    x_train, y_train, x_val, y_val = load_datasets()
    mv(project_path + actual_model, project_path + "past_models/" + actual_model)
    new_model_name = rename_model(actual_model, False)
    set_enviroment_var("COM_MODEL", new_model_name)
    model, history = creating_model(project_path + get_enviroment_var("COM_MODEL"), x_train, y_train, x_val, y_val)
    
    # Print final metrics
    print(f"Final validation RMSE: {min(history.history['val_root_mean_squared_error'])}")
    return model, history

if __name__ == "__main__":
    model, history = manual_training()