import pandas as pd
import numpy as np 



#change this for your path
df_path = "proyecto_p2/models_media/datasets/BANES Energy Data Electricity.csv"
df_result = "proyecto_p2/models_media/processed_datasets/"


#here i'm oppening the csv with the ; separator
df = pd.read_csv(df_path,sep = ";",parse_dates=['date'])

#I deleted some columns that  are useless for this model
df = df.drop(columns = ["Column1","units","postcode","msid","mpan","totalunits"] )



#Sorting the dataset by dates
df.sort_values(by=["date"], inplace=True)


'''
Here i was making an array that looks like this

[[][]...[]] = x                                    [] = y
          ↑                                          ↑
This part are the first                    This is the value that the 
47 values on the dataset                   model are going to predict
'''
def x_to_y(df):
    df_as_np = df.to_numpy()
    x = []
    y = []

    for i in (df_as_np):
        row = [[a] for a in i[2:49]]
        x.append(row)
        label = i[49]
        y.append(label) 
    
    return np.array(x), np.array(y)



x,y = x_to_y(df)

x_train,y_train = x[:133000], y[:133000]
x_val,y_val = x[133000:150000], y[133000:150000]
x_test,y_test = x[150000:], y[150000:]

print(x_train.shape," ",y_train.shape," ",x_val.shape," ",y_val.shape," ",x_test.shape," ",y_test.shape)



np.save(df_result + "x_train.npy", x_train)
np.save(df_result +"y_train.npy", y_train)
np.save(df_result + "x_val.npy", x_val)
np.save(df_result +"y_val.npy", y_val)
np.save(df_result + "x_test.npy", x_test)
np.save(df_result +"y_test.npy", y_test)
