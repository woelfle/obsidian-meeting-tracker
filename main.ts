import { App, MarkdownPostProcessorContext, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MeetingTimerSettings {
	autoLog: boolean;
	dateFormat: string;
	logDateLinking: string;
	duration: string;
	notify: string;
}

const DEFAULT_SETTINGS: MeetingTimerSettings = {
	autoLog: false,
	dateFormat: 'YYYY-MM-DD',
	logDateLinking: 'none',
	duration: '00:25',
	notify: '5'
}

type Time = {
	h: number
	m: number
	s: number
}

function leadingZeros(num: number, totalLength: number): string {
	return String(num).padStart(totalLength, '0');
}

function timeToString(t:Time) {
	const hours = leadingZeros(t.h, 2)
	const minutes = leadingZeros(t.m, 2)
	const seconds = leadingZeros(t.s, 2)
	return (`${hours}:${minutes}:${seconds}`)
}

export default class NoteTimer extends Plugin {
	settings: MeetingTimerSettings;
	timerInterval : undefined | number = undefined

	nextOpenLine(positions:number[], target:number) {
		// target: identifies the table location
		// +2: next 2 line breaks are md table column titles, and format lines
		return positions[positions.findIndex(n => n > target)+2]
	}

	
	resolveNotify(src:string, setting:string) {
		let result = setting;
		if(src.toLowerCase().contains('notify')) {
			const arr = src.match(/^notify:(.)*$/gm);
			if(arr != null && arr.length > 0) {
				result = arr[0];
			} else {
				console.log("No notify configured. Using default")
			}
		}
		console.log(`Resolved notify: ${result}`)
		return result
	}

	resolveDuration(src:string, setting:string) {
		const key = `duration`
		console.log(`resolve ${key}: ${src} ${setting}`)
		let result = setting;
		if(src.toLowerCase().contains(key)) {
			const arr = src.match(/^duration:(.)*$/gm);
			if(arr != null && arr.length > 0) {
				const line = arr[0];
				result = line.slice(line.indexOf(`:`)+1, line.length).trim()
			} else {
				console.log(`No ${key}  configured. Using default`)
			}
		}
		console.log(`Resolved ${key}: ${result}`)
		return result
	}

	async extractConfig(ctx:MarkdownPostProcessorContext) {
		const actFile = this.app.vault.getFiles().find(file => file.path === ctx.sourcePath)
		if(actFile != undefined) {
			const curString = await this.app.vault.read(actFile);
			const timerBlockStart = curString.indexOf("```meeting-timer")
			const timerBlockEnd = curString.slice(timerBlockStart, curString.length).indexOf("```", 3) + 3 + timerBlockStart
			const timerConfig = curString.substring(timerBlockStart, timerBlockEnd)
			console.log(timerConfig)
			const duration = this.resolveDuration(timerConfig, this.settings.duration)
			const notify = this.resolveNotify(timerConfig, this.settings.notify)
			console.log(duration)
			console.log(notify)
		}
	}

	async onload() {
		this.registerMarkdownCodeBlockProcessor("meeting-timer", (src,el,ctx) => {
			this.extractConfig(ctx)			
			const time:Time = {h:0,m:25,s:0}
			const stringTime = () => {
				return (timeToString(time))
			}

			const timeDisplay = el.createEl("span", { text: stringTime()})			
			const buttonDiv = el.createDiv({ cls: "meeting-timer-button-group"})
			const start = buttonDiv.createEl("button", { text: "start", cls: "meeting-timer-start" })
			const reset = buttonDiv.createEl("button" ,{ text: "reset", cls: "meeting-timer-reset"})

			const runTimerBackward = () => {
				time.s--
				if (time.s === -1) {
					time.s = 59
					time.m--
				}
				if (time.m === -1) {
					time.m = 59
					time.h--
				}
				timeDisplay.setText(stringTime())
			}

			let isRunning = false

			const timerControl = () => {
				if(!isRunning){
					isRunning = true
					start.setText("pause")
					window.clearInterval(this.timerInterval)
					this.timerInterval = window.setInterval(runTimerBackward, 1000)
				} else if (isRunning){
					isRunning = false
					start.setText("start")
					clearInterval(this.timerInterval)
				}
				if(this.timerInterval != undefined) {
					this.registerInterval(this.timerInterval)
				}
			}



			start.onclick = () => timerControl()
			reset.onclick = () => {
				time.h = 0
				time.m = 25
				time.s = 0
				timeDisplay.setText(stringTime())
			}
		})
		

		await this.loadSettings();

		this.addSettingTab(new NoteTimerSettingsTab(this.app, this));

	}

	onunload() {
		console.log('unloading meeting plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class NoteTimerSettingsTab extends PluginSettingTab {
	plugin: NoteTimer;

	constructor(app: App, plugin: NoteTimer) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Obsidian Meeting Timer Settings'});

		new Setting(containerEl)
			.setName('Meeting duration')
			.setDesc('The default duration of a meeting. E.g. 30 minutes. The format is HH:MM')
			.addText(text => text
				.setValue(this.plugin.settings.duration)
				.setPlaceholder('HH:MM')
				.onChange(async (value) => {
					this.plugin.settings.duration = value
					await this.plugin.saveSettings()
				}));
	}
}
