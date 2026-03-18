with open('src/analytics/mod.rs', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(400, 420):
    try:
        print(f"{i+1:3d}: {lines[i].rstrip()}")
    except:
        pass
