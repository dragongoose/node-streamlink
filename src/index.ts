import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { EventEmitter } from "events";
import fs from "fs";

export interface IEnd {
  exitCode?: number | string;
  duration?: number | null;
  output?: string;
  stream: string;
}

interface IOutput {
  error?: string;
  plugin?: string;
  metadata?: {
    id: string;
    author: string;
    category: string;
    title: string;
  };
  streams?: {
    [quality: string]: {
      type: "hls" | "http" | "muxed-stream" | "dash" | "hls7" | string;
      url: string;
      headers: any;
      master: string;
    };
  };
}

export declare interface Streamlink {
  on(event: "begin", listening: (link: string) => void): this;
  on(event: "end", listening: (info: IEnd) => void): this;
  on(event: "close", listening: () => void): this;
  on(event: "error", listening: (error: Error) => void): this;
  on(event: "log", listening: (log: string) => void): this;
}

export interface StreamlinkOptions {
  outputLocation: string
  outputStdout: boolean
  otherArgs: string[]
}

export class Streamlink extends EventEmitter {
  public stream: string;
  public streaming: boolean = false;
  private qual: string = "best";
  private child?: ChildProcessWithoutNullStreams;
  private startTime?: number;
  private qualities: string[] = [];
  private options: StreamlinkOptions;

  constructor(stream: string, startingOptions: StreamlinkOptions) {
    super();
    this.stream = stream;
    this.options = startingOptions
  }

  public quality = (quality: string) => {
    this.qual = quality;
    return this;
  };

  public isLive = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      exec("streamlink --json " + this.stream, (_err, stdout) => {
        const json = JSON.parse(stdout) as IOutput;

        if (json.error) {
          reject(false)
        } else {
          this.qualities = Object.keys(json.streams!);
          resolve(true)
        }
      });
    })
  };

  public begin = async () => {
    if (this.options.outputLocation && fs.existsSync(this.options.outputLocation)) {
      this.emit("error", "Can not create stream, file already exists.");
      return this;
    }

    const isLive = await this.isLive()
    if (!isLive) {
      this.emit("error", "Can not start stream, stream is not live.");
      return;
    }

    const args = [];
    if (this.options.outputLocation) {
      args.push("-o");
      args.push(this.options.outputLocation);
    }

    if (this.options.outputStdout) {
      args.push("--stdout");
    }

    args.push(this.stream);
    args.push(this.qual);
    this.startTime = Date.now();

    this.child = spawn("streamlink", args);
    this.child.stdout.on("data", chunk => {
      this.emit("log", chunk);
    });

    this.child.on("close", code => {
      this.emit("close");
      this.end(code);
    });

    this.streaming = true;
    this.emit("begin", this.stream);

    return this;
  };

  public end = (exitCode: number) => {
    if (this.streaming) {
      const res: IEnd = {
        exitCode,
        output: this.options.outputLocation,
        stream: this.stream,
      };

      if (this.startTime) {
        res.duration = Math.floor((Date.now() - this.startTime) / 1000);
      }

      this.streaming = false;
      this.emit("end", res);
    }

    if (this.child) {
      this.child.kill('SIGINT')
    }
    return;
  };

  public getQualities = async (): Promise<string[]> => {
    const isLive = await this.isLive()
    if (!isLive) {
      const error = new Error("Can not get qualities, stream is not live.");
      return Promise.reject(error)
    }

    return this.qualities
  };
}
