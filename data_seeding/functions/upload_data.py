from pymongo import MongoClient, errors
from pymongo.operations import InsertOne
from pymongo.errors import BulkWriteError

def get_client(connection):
    # print(connection['MONGO_HOST'])
    client = MongoClient(connection['MONGO_HOST'], 
                         connection['MONGO_PORT'],
                         username=connection['MONGO_APP_USER'], password=connection['MONGO_APP_PASSWORD'], 
                         authSource=connection['DB_NAME'],
                         connectTimeoutMS=120000)
    return client

def bulk_insert_stream(list_items, connection, collection, batch_size=1000):
    try:
        client = get_client(connection)
    except:
        print("Cannot connect to the server")
        return -1 
    coll = client[connection['DB_NAME']][collection]
    ops = []
    total = 0
    for i, item in enumerate(list_items):
        ops.append(InsertOne(item))
        if i >= batch_size:
            try:
                #bulk write by batch
                res = coll.bulk_write(ops, ordered=False)
                total += res.inserted_count
            except BulkWriteError as bwe:
                print("BulkWriteError batch:", bwe.details)
                total += bwe.details.get("nInserted", 0)
            ops = []
    if ops:
        try:
            res = coll.bulk_write(ops, ordered=False)
            total += res.inserted_count
        except BulkWriteError as bwe:
            print("BulkWriteError final batch:", bwe.details)
            total += bwe.details.get("nInserted", 0)
    #create indexes
    
    client.close()
    print(f"Completed: {total}/{len(list_items)}")
    return 1