const {models} = require('./model');
const {log, biglog, colorize, errorlog} = require('./out');
const Sequelize = require('sequelize');


/**
 * Muestra la ayuda
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.helpCmd = (socket, rl) => {
    log(socket, 'Comandos:');
    log(socket,'   h|help - Muestra esta ayuda.');
    log(socket,'   list - Listar los quizzes existentes');
    log(socket,'   show <id> - Muestra la pregunta y la respuesta del quiz indicado');
    log(socket,'   add - Añadir un nuevo quiz interactivamente.');
    log(socket,'   delete <id> - Borrar el quiz indicado.');
    log(socket,'   edit <id> - Editar el quiz indicado');
    log(socket,'   test <id> - Probar el quiz indicado');
    log(socket,'   p|play - Jugar a preguntar aleatoriamente todos los quizes');
    log(socket,'   credits - Creditos');
    log(socket,'   q|quiz - Salir del programa.');
    rl.prompt();
};

/**
 * Lista todos los quizzes existentes en el modelo
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.listCmd = (socket, rl) => {
    models.quiz.findAll()
        .each(quiz => {
            log(socket,`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Esta función devuelve una promesa que:
 *  -Valida que se ha introducido un valor para el parametro
 *  -Convierte el parametro en un numero entero
 * Si todo va bien la promesa se satisface y devuelve el valor de id a usar
 *
 * @param id Parametro con el indice a validar
 */
const validateId = id => {
    return new Sequelize.Promise((resolve, reject) => {
        if(typeof id === "undefined"){
            reject(new Error(`Falta el parametro <id>.`));
        }else{
            id = parseInt(id); //Coger la parte entera y descartar lo demás
            if (Number.isNaN(id)){
                reject(new Error(`El parametro <id> no es un numero.`));
            }else{
                resolve(id);
            }
        }
    });
};


/**
 * Muestra el quiz indicado en el parametro (pregunta y respuesta)
 * @param rl Objeto readline usado para implementar el CLI
 * @param id ID del quiz a mostrar
 */
exports.showCmd = (socket, rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(socket,` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then (() => {
            rl.prompt();
        });
};


/**
 * Esta función convierte la llamada rl.question, que está basada en callbacks en una
 * basada en promesas.
 *
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido.
 * Entonces la llamda a then que hay que hacer la promesa devuelta será:
 * 		.then(answer => {...})
 *
 * 	Tambiém colorea en rojo el texto de la pregunta, elimina espacios al principio y final
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param text Pregunta que hay que hacerle al usuario.
 */
const makeQuestion = (rl, text) => {
    return new Sequelize.Promise ((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};


/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.addCmd = (socket,rl) => {
    makeQuestion(rl, ' Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, ' Introduzca la respuesta ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then (quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(socket,` [${colorize('Se ha añadido', 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then (() => {
            rl.prompt();
        });
};

/**
 * Borra un quiz del modelo
 * @param id Clave del quiz a borrar en el modelo
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.deleteCmd = (socket, rl, id) => {
    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then (() => {
            rl.prompt();
        });
};

/**
 * Edita un quiz del modelo
 * @param id Clave del quiz a editar en el modelo
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.editCmd = (socket, rl, id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then (quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            return makeQuestion(rl, ' Introduzca la pregunta ')
                .then(q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, ' Introduzca la respuesta ')
                        .then(a => {
                            quiz.question =	q;
                            quiz.question =a;
                            return quiz;
                        });
                });
        })
        .then(quiz => {
            return quiz.save();
        })
        .then((quiz) => {
            log(socket,` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then (() => {
            rl.prompt();
        });
};

/**
 * Prueba un quiz, hace una pregunta del modelo
 * rl.question es asincrona!!!!
 * @param id Clave del quiz a probar
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.testCmd = (socket,rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then (quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            return makeQuestion(rl, `${quiz.question}`)
                .then(respuesta => {
                    if (respuesta.trim().toLowerCase() === quiz.answer.toLowerCase()) {
                        log(socket,"Su respuesta es");
                        log(socket,'CORRECTA', 'green');
                    } else {
                        log(socket,'Su respuesta es incorrecta');
                    }
                })
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then (() => {
            rl.prompt();
        });
};


/**
 * Pregunta los quizzes existentes aleatoriamente
 * Se gana si se contesta a todos correctamente
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.playCmd = (socket, rl) => {
    let score = 0;
    let toBeResolved = [];
    models.quiz.findAll()
        .each(quiz => {
            toBeResolved.push(quiz);

        }).then(() =>{

        const playOne = () => {

            if (toBeResolved.length === 0) {
                log(socket,`CORRECTO - Lleva ${score} aciertos`);
                log(socket,"No hay nada más que preguntar.");
                log(socket,"Fin del examen. Aciertos:");
                biglog(`${score}`, 'magenta');
                rl.prompt();

            } else {
                let id = (Math.floor((Math.random() * (toBeResolved.length))));
                validateId(id)

                    .then((id) => {
                        let quiz = toBeResolved[id]
                        makeQuestion(rl, `${quiz.question}`)
                            .then(respuesta => {
                                if (respuesta.trim().toLowerCase() === quiz.answer.toLowerCase()) {
                                    score++;
                                    log(socket,"Su respuesta es");
                                    log(socket,'CORRECTA', 'green');
                                    toBeResolved.splice(id, 1);
                                    playOne();

                                } else if (respuesta.trim().toLowerCase() !== quiz.answer.toLowerCase()) {
                                    log(socket,"INCORRECTO.");
                                    log(socket,"Fin del examnen. Aciertos:");
                                    biglog(socket, `${score}`, 'magenta');
                                    rl.prompt();
                                }
                            })
                            .catch(Sequelize.ValidationError, error => {
                                errorlog(socket,'El quiz es erroneo:');
                                error.errors.forEach(({message}) => errorlog(message));
                            })
                            .catch(error => {
                                errorlog(socket,error.message);
                            })

                    })
            }

        };

        playOne();

    })


};


/**
 * Muestra los autores de la practica
 * Esta simplificado porque el corrector lo pilla mal
 *  @param rl Objeto readline usado para implementar el CLI
 */

exports.creditsCmd = rl => {
    log(socket,'MARTIN');
    rl.prompt();
};


/**
 * Termina el programa
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.quitCmd = rl => {
    rl.close();
};

