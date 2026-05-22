import { ChatError } from "../../../../shared/domain/errors/AppError";
import { Message } from "../../domain/entities/Message";
import { IChatRepository } from "@features/chat/domain/repositories/IChatRepository";

export class SendMessageUseCase {
    constructor(private readonly chatRepo:IChatRepository){}
    async execute(
        roomId:string, 
        userId:string, 
        content:string
    ):Promise<Message>{
        const trimed = content.trim();
        if(!trimed) throw new ChatError("El mensaje no puede estar vacío");
        if (trimed.length > 500) throw new ChatError("Maximo 500 caracteres");
        return this.chatRepo.sendMessage(roomId, userId, trimed);
    }
}

