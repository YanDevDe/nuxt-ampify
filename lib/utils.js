module.exports = {
    //From https://stackoverflow.com/a/48032528/8761461 - Thank You Overcl9ck!
    replaceAsync: async (str, regex, asyncFn) => {
        const promises = [];
        str.replace(regex, (match, ...args) => {
            const promise = asyncFn(match, ...args);
            promises.push(promise);
        });
        const data = await Promise.all(promises);
        return str.replace(regex, () => data.shift());
    }
}