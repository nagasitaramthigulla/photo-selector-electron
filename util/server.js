const http = require('http');

const finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

class Server {
    server;
	constructor(staticPath) {
        const serve = serveStatic(staticPath);
        this.server = http.createServer(function (req, res) {
            var done = finalhandler(req, res);
            serve(req, res, done);
        });
    }

    async start() {
        const _this = this;
        await new Promise((resolve, reject) => {
            _this.server.listen(0, 'localhost', () => {
                resolve();
            });
            _this.server.on('error', reject);
        });
        console.log(JSON.stringify(this.server.address()));
        return this.server.address().port;
    }

    getAddress() {
        let address = this.server.address();
        return `http://localhost:${address.port}`; 
    }
}

module.exports = Server;