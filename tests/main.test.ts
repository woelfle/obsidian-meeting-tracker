import { timeToString, Time } from "./../src/main";
import { MarkdownPostProcessorContext} from 'obsidian';

function do_it(ctx: MarkdownPostProcessorContext | null) : string {
	return "blup"
}

describe("Time to String", () =>{
	it("should preprend leading zeros", () => {
		do_it(null);
		const time:Time = {h:1,m:1,s:1}
		const result = timeToString(time)
		expect(result).toEqual("01:01:01")
	})
});
