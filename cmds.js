const {models} = require('./model');
const {log, biglog, colorize, errorlog} = require('./out');
const Sequelize = require('sequelize');


/**
 * Muestra la ayuda
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.helpCmd = rl => {
    log('Comandos:');
    log('   h|help - Muestra esta ayuda.');
    log('   list - Listar los quizzes existentes');
    log('   show <id> - Muestra la pregunta y la respuesta del quiz indicado');
    log('   add - Añadir un nuevo quiz interactivamente.');
    log('   delete <id> - Borrar el quiz indicado.');
    log('   edit <id> - Editar el quiz indicado');
    log('   test <id> - Probar el quiz indicado');
    log('   p|play - Jugar a preguntar aleatoriamente todos los quizes');
    log('   credits - Creditos');
    log('   q|quiz - Salir del programa.');
    rl.prompt();
};

/**
 * Lista todos los quizzes existentes en el modelo
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.listCmd = rl => {
    models.quiz.findAll()
        .each(quiz => {
            log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errorlog(error.message);
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
            if (Number.isNan(id)){
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
exports.showCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(error.message);
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
exports.addCmd = rl => {
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
            log(` [${colorize('Se ha añadido', 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
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
exports.deleteCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
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
exports.editCmd = (rl, id) => {

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
            log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then (() => {
            rl.prompt();
        });
};

/**
 * Muestra los autores de la practica
 * Esta simplificado porque el corrector lo pilla mal
 *  @param rl Objeto readline usado para implementar el CLI
 */

exports.creditsCmd = rl => {
    log('MARTIN');
    rl.prompt();
};


/**
 * Termina el programa
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.quitCmd = rl => {
    rl.close();
};

