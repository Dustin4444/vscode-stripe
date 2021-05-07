import * as path from 'path';
import * as vscode from 'vscode';
import {
  CloseAction,
  ErrorAction,
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
  Trace,
} from 'vscode-languageclient';

import {Telemetry} from '../telemetry';

export class StripeLanguageClient {
  static activate(
    context: vscode.ExtensionContext,
    serverOptions: ServerOptions,
    telemetry: Telemetry,
  ) {
    const outputChannel = vscode.window.createOutputChannel('Stripe Lanaguage Client');
    outputChannel.appendLine('Starting universal client');
    const universalClientOptions: LanguageClientOptions = {
      // Register the server for stripe-supported languages. dotnet is not yet supported.
      documentSelector: [
        {scheme: 'file', language: 'javascript'},
        {scheme: 'file', language: 'typescript'},
        {scheme: 'file', language: 'go'},
        {scheme: 'file', language: 'java'},
        {scheme: 'file', language: 'php'},
        {scheme: 'file', language: 'python'},
        {scheme: 'file', language: 'ruby'},
      ],
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
      },
    };

    const universalClient = new LanguageClient(
      'stripeLanguageServer',
      'Stripe Language Server',
      serverOptions,
      universalClientOptions,
    );

    universalClient.onTelemetry((data: any) => {
      const eventData = data.data || null;
      telemetry.sendEvent(data.name, eventData);
    });

    universalClient.start();
    this.activateDotNetServer(context, outputChannel);
  }

  // https://github.com/tintoy/msbuild-project-tools-vscode/blob/a4288d06830b9563a87496ff5b3eee2e7fa6ab92/src/extension/extension.ts#L251-L279
  static async activateDotNetServer(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
  ) {
    // replace this with real function that can find the executable? Or maybe this isn't the right way to kick this off... not all users may have dotnet installed.
    // In fact, we probably only want to start up this server if they are on at .net file. See if there is an event that would let us do this.

    // The issue with this is that we'd be required to depend on this extension at startup.
    // And... santa prevents this
    const dotNetExecutable = '/usr/local/share/dotnet/dotnet';

    // Replace this with the one that is packed into this extension.
    // const serverAssembly = context.asAbsolutePath(
    //   '/Users/gracegoo/stripe/dotnet/stripe-dotnet-language-server/bin/Debug/net5.0/stripe-dotnet-language-server.dll',
    // );

    const serverAssembly =
      '/Users/gracegoo/stripe/dotnet/stripe-dotnet-language-server/bin/Debug/net5.0/stripe-dotnet-language-server.dll';

    console.log(serverAssembly);

    const serverOptions: ServerOptions = {
      command: dotNetExecutable,
      args: [serverAssembly],
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // Register the server for plain text documents
      documentSelector: [{scheme: 'file', language: 'csharp'}],
      synchronize: {
        configurationSection: 'stripeCsharpLangaugeServer',
        fileEvents: vscode.workspace.createFileSystemWatcher('**/*.cs'),
      },
      diagnosticCollectionName: 'Stripe C# language server',
      errorHandler: {
        error: (error, message, count) => {
          console.log(message);
          console.log(error);

          return ErrorAction.Continue;
        },
        closed: () => CloseAction.Restart,
      },
      revealOutputChannelOn: RevealOutputChannelOn.Error,
    };

    // Create the language client and start the client.
    const dotnetClient = new LanguageClient(
      'stripeCsharpLangaugeServer',
      'Stripe C# Server',
      serverOptions,
      clientOptions,
    );

    dotnetClient.trace = Trace.Verbose;
    outputChannel.appendLine('Starting C# language service...');

    const disposable = dotnetClient.start();
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);

    await dotnetClient.onReady();
    outputChannel.appendLine('C# language service is running.');
  }
}
