assume cs:abc
abc segment
start: mov ax, 2
       add ax, ax
       add ax, ax
       
       mov ax, 4c00h
       int 21h
abc ends
end start