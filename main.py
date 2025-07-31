import json
import datetime
from app.services.photo_check.photo_check_service import invoke_model

def read_flats_json_from_tg(path):
    with open(path, 'r', encoding='utf-8') as file:
        data = json.load(file)

    res = []
    for item in data['messages']:
        # print('\n\n\n',item,'\n\n\n')
        if item['type'] == 'message' and item['id'] and item['text'] and 'photo' in item:
            # print(str(item['text']) in ('ЮЗАО','ЗАО','ЮАО'),'\n')
            #TODO: add regions parsing!
            #TODO: add msg parsing by llm!
            str_check_msg = str(item['text'])
            if 'Москва' in str_check_msg or 'Комиссия' in str_check_msg or '₽/месяц' in str_check_msg:
                temp_dict = {
                    "id": item['id'],
                    "date": item.get('date',datetime.datetime.now(datetime.UTC)),
                    "photo": item['photo'],
                }
                for index, onestr in enumerate(item['text_entities']):
                    if 'кв' in onestr['text'] or 'этаж' in onestr['text'] or 'м²' in onestr['text']:
                        temp_dict['name'] = onestr['text']
                    elif 'Москва' in onestr['text'] or 'м.' in onestr['text']:
                        temp_dict['address'] = onestr['text']
                    elif onestr.get('type'):
                        if onestr['type'] == 'text_link' and onestr['text'] == 'на карте':
                            temp_dict['map_link'] = onestr['href']
                    elif '₽/месяц' in onestr['text']:
                        temp_dict['price'] = onestr['text']
                    elif 'Источник:' in onestr['text']:
                        temp_dict['source'] = item['text_entities'][index+1]['text']
                        temp_dict['source_link'] = item['text_entities'][index+1]['href']

                res.append(temp_dict)
    print(f"Found {len(res)} flats! Goto image check\n")       
    return res 
        



            
if __name__ == "__main__":
    clean_flats_list = invoke_model(read_flats_json_from_tg('app/test_data/result.json'))
    # print(clean_flats_list,'\n\n\n\n\n')
   
    # scored_flats_list = invoke_model(clean_flats_list)
    # print(clean_flats_list,'\n\n\n\n\n')
    with open('res.txt', 'a') as f:
        jstr = json.dumps(clean_flats_list, indent=2, ensure_ascii=False)
        f.write(jstr)