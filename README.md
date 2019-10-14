## Домашнее задание "Инфраструктура" ШРИ 2019

### Запуск сервера
    cd ./server && npm install && npm start

### Запуск агента
    cd ./agent && npm install && npm start

## Требования

- [x] Сервер должен генерировать уникальные номера сборок.

        Сервер генерирует последовательные числовые идентификаторы 1, 2, 3...

- [x] Сервер должен максимально утилизировать имеющихся агентов.

        На данный момент, сервер запускает только одну задачу на одном агенте в один момент времени.
        После выполнения задачи агентом, сервер выдаст агенту новую задачу если очередь задач не пуста.
        В качестве улучшения, можно было бы запускать несколько задач на агенте (например, равное кол-ву ядер процессора).  

- [x] Сервер должен корректно обрабатывать ситуацию, когда агент прекратил работать между сборками.

        Если при попытке запустить сборку на агенте возникла ошибка, 
        приложение удаляет агент из списка агентов, и возвращает задачу в начало очереди на сборку.

- [x] Сервер должен корректно обрабатывать ситуацию, когда агент прекратил работать в процессе выполнения сборки.

        Раз в `CHECK_AGENTS_INTERVAL` миллисекунд, сервер пингует агенты которые выполняют сборки.
        Если агент не отвечает, сервер возвращает задачу на сборку в очередь, и удаляет агент из списка.
        В дальнейшем, задача будет отдана другому свободному агенту. 

- [x] Сервер должен корректно обрабатывать ситуацию, когда агенты не справляются с поступающими заявками.

        Если в очереди на сборку накапливается более `MAX_QUEUE_SIZE` задач, 
        то сервер перестает принимать новые задачи, и сообщает клиенту о необходимости увеличить кол-во агентов. 

- [x] Агент должен корректно обрабатывать ситуацию, когда при старте не смог соединиться с сервером.

        Если у агента не получилось соединиться с сервером, 
        то агент выводит сообщение об ошибке в stderr, 
        и завершает свою работу с кодом 1.

- [x] Агент должен корректно обрабатывать ситуацию, когда при отправке результатов сборки не смог соединиться с сервером.

        Если во время отправки результатов сборки на сервер, произошла ошибка, 
        агент пытается отправить результаты еще раз через `SERVER_NOTIFICATION_RETRY_INTERVAL` миллисекунд.
        Лимита на количество попыток нет - пока агент запущен, он будет пытаться отослать результаты на сервер.
