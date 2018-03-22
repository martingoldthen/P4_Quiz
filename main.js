const readline = require('readline');

const {log, biglog, colorize, errorlog} = require('./out');

const cmds = require('./cmds');

const net = require('net');

net.createServer(socket => {
    console.log('Se ha conectado un cliente desde' + socket.remoteAddress);
    //Mensaje inicial
    biglog(socket, "CORE quiz", "green");


    const rl = readline.createInterface({
        input: socket,
        output: socket,
        completer: (line) => {
            const completions = 'h help q quit add delete edit list test p play credits q quiz'.split(' ');
            const hits = completions.filter((c) => c.startsWith(line));
            // show all completions if none found
            return [hits.length ? hits : completions, line];
        }
    });

    socket.on("end", () => {rl.close();})
        .on("error", () => {rl.close();});

    const stringPrompt = colorize("quiz>  ", "blue");
    rl.setPrompt(stringPrompt);
    rl.prompt();

    rl.on('line', (line) => {

        let args = line.split(" ");
        let cmd = args[0].toLowerCase().trim();

        switch (cmd) {
            case '':
                rl.prompt(socket, rl);
                break;
            case 'help':
            case 'h':
                cmds.helpCmd(socket, rl);
                break;
            case 'quit':
            case 'q':
                cmds.quitCmd(socket, rl);
                break;
            case 'add':
                cmds.addCmd(socket, rl);
                break;
            case 'list':
                cmds.listCmd(socket, rl);
                break;
            case 'show':
                cmds.showCmd(socket, rl, args[1]);
                break;
            case 'test':
                cmds.testCmd(socket, rl, args[1]);
                break;
            case 'play':
            case 'p':
                cmds.playCmd(socket, rl);
                break;
            case 'delete':
                cmds.deleteCmd(socket, rl, args[1]);
                break;
            case 'edit':
                cmds.editCmd(socket, rl, args[1]);
                break;
            case 'credits':
                cmds.creditsCmd(socket, rl);
                break;
            default:
                log(socket, `Comando desconocido: '${colorize(cmd, "red")}'`);
                log(socket, `Use ${colorize("help", "green")} para ver todos los comandos disponibles`);
                rl.prompt();
                break;
        }

    }).on('close', () => {
        log(socket, 'Hasta luego MariCarmen');
        process.exit(0);
    });
})
.listen(3030);

