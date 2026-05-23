export default (client: any) => {
    client.handleEvents = async (eventFiles: string[], path: string) => {
        for (const file of eventFiles) {
            const event = await import(`../events/${file}`);
            if (event.once) {
                client.once(event.name, (...args: any[]) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args: any[]) => event.execute(...args, client));
            }
        }
    };
};
