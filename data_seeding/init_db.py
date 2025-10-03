import argparse
import json
from pymongo import MongoClient, errors
from pymongo.operations import InsertOne
from pymongo.errors import BulkWriteError
from functions.upload_data import *

with open('./data_process/items_detail.json', 'r') as file:
    list_items = json.load(file)

list_items_li = [{'name': item['name']} for item in list_items]

def initialize_database(connection):
    res = bulk_insert_stream(list_items, connection, collection=connection['COLLECTION_NAME'])
    if res == -1:
        return
    
    _ = bulk_insert_stream(list_items_li, connection, collection=connection['COLLECTION_LI_NAME'])
    client = get_client(connection)
    coll = client[connection['DB_NAME']][connection['COLLECTION_NAME']]
    coll_1 = client[connection['DB_NAME']][connection['COLLECTION_LI_NAME']]
    #create indexes
    text_indexes, weight_indexs = ['general_information', 'name', 'ingredients'], [10, 5, 2]
    coll.create_index([(field, "text") for field in text_indexes], name="multi_text_idx",
                        weights={field: weight_indexs[i] for i, field in enumerate(text_indexes)})
    coll.create_index([('categories', 1), ('brand', 1)], name=f"category_idx")
    coll.create_index([('brand', 1)], name=f"brand_idx")
    coll.create_index([('price.chemist_warehouse')], name=f"price_idx")
    coll.create_index([('avg_reviews')], name=f"avg_reviews_idx")
    coll.create_index([('count_reviews')], name=f"count_reviews_idx")

    coll_1.create_index([('name', 'text')], name=f"name_idx")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--mongodb-host', type=str, required=True)
    parser.add_argument('--mongodb-port', type=str, required=True)
    parser.add_argument('--db-name', type=str, required=True)
    parser.add_argument('--collection-item-name', type=str, required=True)
    parser.add_argument('--collection-item-li-name', type=str, required=True)
    parser.add_argument('--mongodb-app-user', type=str, required=True)
    parser.add_argument('--mongodb-app-password', type=str, required=True)
    args = parser.parse_args()
    mongo_connection = {
        'MONGO_HOST': args.mongodb_host,
        'MONGO_PORT': int(args.mongodb_port),
        'DB_NAME': args.db_name,
        'COLLECTION_NAME': args.collection_item_name,
        'COLLECTION_LI_NAME': args.collection_item_li_name,
        'MONGO_APP_USER': args.mongodb_app_user,
        'MONGO_APP_PASSWORD': args.mongodb_app_password
    }

    initialize_database(mongo_connection)


