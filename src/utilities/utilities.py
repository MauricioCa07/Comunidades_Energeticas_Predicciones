import os

def mv(file,path):
    os.rename(file,path)

def get_enviroment_var(varible): return os.environ.get(varible)

def set_enviroment_var(variable,new_name): os.environ[variable] = new_name

def rename_model(name,is_new_version):
    
    if is_new_version: 
        # pointer to the "-" that sould be 
        # before the number of the version
        pointer =  name.find("-")        
        version_number = int(name[pointer+1:name[pointer+1:].find(".")+pointer+1])
        name = name[:pointer+1]+str(version_number+1)+".0.keras"
    else:
        # When it isn't a new version
        # we just change the number after the "."
        pointer =  name.find(".") 
        subversion_number = int(name[pointer+1:name[pointer+1:].find(".")+pointer+1])
        name = name[:pointer+1]+str(subversion_number+1)+".keras"
    
    return name

