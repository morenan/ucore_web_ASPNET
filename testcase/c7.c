struct S1 {
	int i, j, k;
};

struct S2 {
	int i; char* j; double k;
};

void main(int argc, char** argv) {
	struct S1 s1;
	struct S2 s2 = {3.0, 2.0, 1.0};
	s1.i = 1;
	s1.j = 2;
	s1.k = 3;
	struct S1* s3 = &s1;
	s3->i = 3;
	s3->j = 2;
	s3->k = 1;
	break;
	//(&s1.i)->i = 4;
}

